// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import TerminalTestSuite from './tests';
import {buildScriptingPrompt} from '@ai/prompts/trash';
import describeCommandError from '@ai/utils/describe_command_error';
import {isNothingReply} from '@ai/watchdog/consult';
import buildWatchdogSnapshot from '@ai/watchdog/snapshot';
import {CALL_KW_RE, NOTIFICATION_SEVERITY_RE, truncateTail, truncateHead, causeChain} from '@ai/watchdog/stimuli';
import * as local from '@terminal/core/storage/local';
import * as session from '@terminal/core/storage/session';
import stringifyReplacer from '@terminal/utils/stringify_replacer';
import uniqueId from '@common/utils/unique_id';
import streamLines from '@ai/utils/stream_lines';
import renderIcon from '@terminal/templates/icon';
import parseHTML from '@terminal/utils/parse_html';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import isCompatibleOdooVersion from '@common/utils/is_compatible_odoo_version';
import rpcQuery from '@odoo/rpc';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import getSessionInfo from '@odoo/net_utils/get_session_info';
import Screen, {LINE_SELECTOR} from '@terminal/core/screen';
import asyncSleep from '@terminal/utils/async_sleep';

export default class TestRegressions extends TerminalTestSuite {
  async test_screen_buffer_lifecycle() {
    const container = document.createElement('div');
    const screen = new Screen({host: 'localhost'});
    const saved: Array<string> = [];
    screen.start(container, {
      inputColors: {},
      inputMode: 'single',
      maxLines: 5,
      onCleanScreen: content => this.assertEqual(content, ''),
      onSaveScreen: content => {
        saved.push(content);
      },
      onInput: () => undefined,
      onInputKeyUp: () => undefined,
    });
    try {
      screen.print('discard');
      screen.clean();
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      this.assertEqual(screen.getContent(), '');
      screen.print('discard');
      screen.setContent('<span>restored</span>');
      this.assertEqual(screen.getContent(), '<span>restored</span>');
      screen.clean();
      for (let i = 0; i < 105; ++i) screen.print(i);
      const live = screen.printLive();
      live.update('live');
      const output = container.querySelector('#terminal_screen');
      this.assertEqual(output?.lastElementChild, live.el, 'Live output must follow buffered output');
      await asyncSleep(800);
      this.assertEqual(output?.querySelectorAll(LINE_SELECTOR).length, 5);
      this.assertEqual(saved.length, 1, 'A burst must produce one trimmed snapshot');
      this.assertEqual(saved[0], screen.getContent());
      screen.print('discard');
      screen.clean();
      await asyncSleep(800);
      this.assertEqual(screen.getContent(), '');
      this.assertEqual(saved.length, 1, 'Clear must not save discarded output');
      screen.print('discard');
      screen.getContent();
      screen.destroy();
      await asyncSleep(800);
      this.assertEqual(saved.length, 1, 'Retired background screens must stop saving');
    } finally {
      screen.destroy();
    }
  }

  async test_rpc_promise() {
    const request = rpcQuery<number>({model: 'res.partner', method: 'search_count', args: [[]]});
    this.assertTrue(request instanceof Promise, 'RPCs must return native promises, including on legacy Odoo');
    this.assertTrue((await request) > 0);
  }

  async test_cached_queries() {
    const name = uniqueId('terminal_test_cache');
    const read = (limit: number, force: boolean = false) =>
      cachedSearchRead(name, 'res.partner', [], ['name'], {}, force ? {force: true} : undefined, {limit});
    const [first, concurrent] = await Promise.all([read(1), read(1)]);
    this.assertEqual(first.length, 1);
    this.assertEqual(first, concurrent, 'Concurrent reads must share their RPC result');
    this.assertEqual((await read(2)).length, 2, 'Pagination must be part of the cache key');
    const refreshed = await read(1, true);
    this.assertNotEqual(refreshed, first);
    this.assertEqual(await read(1), refreshed, 'Force must refresh the ordinary cache entry');
    const [sessionA, sessionB] = await Promise.all([getSessionInfo(), getSessionInfo()]);
    this.assertNotEmpty(sessionA);
    this.assertEqual(sessionA, sessionB);
    const login = this.terminal.getShell().getVM().getRegisteredCmds().login;
    const users = await login.options.call(this.terminal, 'user');
    this.assertTrue(users.includes('admin'), 'Login completion must return the login field');
  }

  async test_terminal_icons() {
    for (const version of ['19.0', '20.0', '20.0+e', 'saas~20.0']) {
      this.assertTrue(isCompatibleOdooVersion(version));
    }
    const version = getOdooVersion('major');
    const modern = typeof version === 'number' && version >= 20;
    const spinner = parseHTML(renderIcon('fa-cog', 'fa-spin terminal-ai-conv-busy'));
    this.assertTrue(spinner.classList.contains(modern ? 'oi-spin' : 'fa-spin'));
    this.assertTrue(spinner.classList.contains('terminal-ai-conv-busy'));
    const icons = this.terminal.el.querySelectorAll('.terminal-screen-info-zone i');
    this.assertEqual(icons.length, 6);
    for (const icon of icons) {
      const style = getComputedStyle(icon, '::before');
      this.assertTrue(!['none', 'normal', '""', "''"].includes(style.content), 'Toolbar icon must have a glyph');
      this.assertTrue(style.fontFamily.includes(modern ? 'Material Symbols' : 'FontAwesome'));
      // $FlowFixMe[prop-missing] The bundled DOM definitions omit the CSS Font Loading API.
      const fonts = await document.fonts.load(`${style.fontSize} ${style.fontFamily}`);
      this.assertTrue(fonts.length > 0, 'Icon font must load');
    }
  }

  async test_stream_odoo_response() {
    const response = await fetch('/web/login');
    this.assertTrue(response.ok);
    const text = await response.clone().text();
    const expected = text.split('\n');
    if (text.endsWith('\n')) expected.pop();
    const lines = [];
    const reader = response.body?.getReader();
    for await (const line of streamLines({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: {},
      text: () => response.text(),
      body: reader
        ? {
            getReader: () => ({
              read: async () => {
                const {done, value} = await reader.read();
                return {done, value};
              },
            }),
          }
        : null,
    }))
      lines.push(line);
    this.assertEqual(JSON.stringify(lines), JSON.stringify(expected.map(line => line.trim())));
  }

  async test_shell_odoo_errors() {
    const shell = this.terminal.getShell();
    const code = 'read odooterminal_missing_model 1';
    for (const source of [code, `$regression_result = (${code})`, `false ? 1 : (${code})`]) {
      let rejected = false;
      try {
        await this.terminal.execute(source, false, true);
      } catch (err) {
        rejected = true;
        this.assertTrue(describeCommandError(err).includes('odooterminal_missing_model'));
      }
      this.assertTrue(rejected, 'Real Odoo RPC errors must reach the caller');
      this.assertEmpty(shell.getActiveJobs());
    }
    this.assertEqual(await this.terminal.execute(`true ? 7 : (${code})`, false, true), 7);
    this.assertNotEmpty(await this.terminal.execute('whoami', false, true));
    // Legacy Odoo opens dialogs for these expected RPC errors.
    for (const modal of document.querySelectorAll('.modal')) {
      if (modal instanceof HTMLElement && modal.textContent.includes('odooterminal_missing_model')) {
        this.closeModal(modal);
      }
    }
  }

  async test_scripting_prompt_examples() {
    const prompt = buildScriptingPrompt();
    const conditional = '$qty = 0; $total = 120; $average = $qty > 0 ? $total / $qty : 0; $average';
    this.assertTrue(prompt.includes(conditional));
    this.assertEqual(await this.terminal.execute(conditional, false, true), 0);
    const closure = [
      '$factor = 2; $scale = function (n) { return $n * $factor }',
      '$caller = function (factor) { return ($$scale 3) }; $$caller 100',
    ];
    for (const line of closure) this.assertTrue(prompt.includes(line));
    this.assertEqual(await this.terminal.execute(closure.join('\n'), false, true), 6);
    this.assertEqual(await this.terminal.execute('$factor = 4; $$scale 3', false, true), 12);
    for (const [source, expected] of [
      ['false ? 1 : true ? 2 : 3', 2],
      ['$fn = function () { return 7 }; arr_map [1,2,3] $fn', [7, 7, 7]],
      ['arr_slice [10,20,30,40] 1 3', [20, 30]],
      [
        '$arr = [2,1,2,3]; $unique = (arr_unique $arr); $reverse = (arr_reverse $arr); [$unique,$reverse,$arr]',
        [
          [2, 1, 3],
          [3, 2, 1, 2],
          [2, 1, 2, 3],
        ],
      ],
      ['[(ceil -n -1.8), (round -n -1.5), (trunc -n -1.8), (fixed -n 3.7 -d 0)]', [-1, -1, -1, 4]],
    ]) {
      this.assertEqual(JSON.stringify(await this.terminal.execute(source, false, true)), JSON.stringify(expected));
    }
  }

  async test_graphics_native_canvas() {
    const canvas = await this.terminal.execute(
      '$regression_canvas = (2d_create_window -w 40 -h 30); $regression_canvas',
      false,
      true,
    );
    this.assertTrue(canvas instanceof HTMLCanvasElement);
    try {
      this.assertEqual(canvas.width, 40);
      this.assertEqual(canvas.height, 30);
      this.assertTrue(canvas.isConnected);
      const windows = await this.terminal.execute('2d_list_windows', false, true);
      this.assertTrue(windows.some(item => item.id === canvas.id));
      this.assertEqual(
        JSON.stringify(canvas, stringifyReplacer),
        JSON.stringify({type: 'HTMLCanvasElement', id: canvas.id, width: 40, height: 30}),
      );
      const context = canvas.getContext('2d');
      context.fillRect(0, 0, 40, 30);
      this.assertEqual(context.getImageData(0, 0, 1, 1).data[3], 255);
      await this.terminal.execute('2d_clear -c $regression_canvas', false, true);
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      this.assertEqual(context.getImageData(0, 0, 1, 1).data[3], 0);
    } finally {
      await this.terminal.execute('2d_destroy_window -c $regression_canvas', false, true);
    }
    this.assertFalse(canvas.isConnected);
  }

  async test_browser_storage() {
    const key = uniqueId('terminal_test_storage');
    try {
      this.assertTrue(local.setStorageItem(key, {value: 1}));
      this.assertTrue(session.setStorageItem(key, {value: 2}));
      this.assertEqual(localStorage.getItem(key), '{"value":1}');
      this.assertEqual(sessionStorage.getItem(key), '{"value":2}');
      this.assertEqual(JSON.stringify(local.getStorageItem(key, null)), '{"value":1}');
      this.assertEqual(JSON.stringify(session.getStorageItem(key, null)), '{"value":2}');
      this.assertTrue(local.removeStorageItem(key));
      this.assertEqual(local.getStorageItem(key, false), false);
      this.assertNotEqual(session.getStorageItem(key, null), null);
    } finally {
      local.removeStorageItem(key);
      session.removeStorageItem(key);
    }
  }

  async test_watchdog_snapshot(): Promise<void> {
    const root = parseHTML(`<div>
      <label for="watchdog_customer_0">Customer</label>
      <div class="o_field_widget o_field_many2one o_required_modifier" name="partner_id">
        <input id="watchdog_customer_0" value="Azure Interior">
      </div>
      <div class="o_field_widget o_field_char o_required_modifier" name="hidden" style="display:none"><input></div>
      <div class="o_field_widget o_field_char o_required_modifier" name="missing"><input></div>
      <div class="o_field_widget o_field_boolean o_required_modifier" name="active"><input type="checkbox"></div>
      <input class="o_field_widget o_field_float o_required_modifier" name="amount" value="0">
      <div class="o_field_widget o_field_selection" name="state">
        <select><option value="draft">Draft</option><option value="done" selected>Done</option></select>
      </div>
      <div class="o_field_widget o_field_many2many_tags o_required_modifier" name="tags">
        <span class="o_tag">VIP</span><input>
      </div>
      <div class="o_field_widget" name="secret"><input type="password" value="never send"></div>
      <div class="o_field_widget o_field_one2many" name="order_line">
        <table class="o_list_table"><thead><tr><th data-name="qty">Quantity</th></tr></thead><tbody>
          <tr class="o_data_row"><td name="qty"><div class="o_field_widget o_required_modifier" name="qty"><input value="12"></div></td></tr>
          <tr class="o_data_row" style="display:none"><td name="qty">999</td></tr>
          <tr class="o_data_row"><td name="qty">3</td></tr>
        </tbody></table>
      </div>
    </div>`);
    document.body?.append(root);
    try {
      const snapshot = buildWatchdogSnapshot(root);
      const fields = Object.fromEntries(snapshot.fields.map(field => [field.name, field]));
      this.assertEqual(fields.partner_id.label, 'Customer');
      this.assertEqual(fields.partner_id.value, 'Azure Interior');
      this.assertEqual(fields.active.value, 'false');
      this.assertEqual(fields.amount.value, '0');
      this.assertEqual(fields.state.value, 'Done');
      this.assertEqual(fields.tags.value, 'VIP');
      this.assertEqual(snapshot.missingRequiredLabels.join(','), 'missing');
      for (const name of ['hidden', 'secret', 'order_line', 'qty']) this.assertFalse(Object.hasOwn(fields, name));
      this.assertEqual(snapshot.rows.length, 2);
      this.assertEqual(snapshot.rows[0].list, 'order_line');
      this.assertEqual(snapshot.rows[0].values['Quantity (qty)'], '12');
      this.assertEqual(snapshot.rows[1].row, 3);
      this.assertEqual(snapshot.rows[1].values['Quantity (qty)'], '3');
      this.assertEqual(snapshot.limitations.length, 0);
      const input = root.querySelector('td input');
      if (!(input instanceof HTMLInputElement)) throw new Error('Missing editable line');
      input.value = '27';
      this.assertEqual(buildWatchdogSnapshot(root).rows[0].values['Quantity (qty)'], '27');
      input.value = 'x'.repeat(350);
      const tbody = root.querySelector('tbody');
      const row = tbody?.querySelector('tr');
      if (!tbody || !row) throw new Error('Missing list');
      for (let i = 0; i < 60; i += 1) tbody.append(row.cloneNode(true));
      const truncated = buildWatchdogSnapshot(root);
      this.assertEqual(truncated.rows.length, 60);
      this.assertTrue(truncated.limitations.includes('2 rows omitted'));
      this.assertTrue(truncated.limitations.some(note => note.includes('values truncated')));
      this.assertEqual(truncated.rows[0].values['Quantity (qty)'].length, 301);
    } finally {
      root.remove();
    }
  }

  async test_watchdog_contracts() {
    for (const method of ['write', 'create', 'web_save', 'unlink']) {
      const match = CALL_KW_RE.exec(`/web/dataset/call_kw/res.partner/${method}`);
      this.assertEqual(match?.[1], 'res.partner');
      this.assertEqual(match?.[2], method);
    }
    for (const method of ['read', 'write_something', 'search_read']) {
      this.assertEqual(CALL_KW_RE.exec(`/web/dataset/call_kw/res.partner/${method}`), null);
    }
    for (const style of ['bg-danger', 'border-warning show', 'text-bg-danger p-2']) {
      this.assertTrue(NOTIFICATION_SEVERITY_RE.test(`o_notification ${style}`));
    }
    for (const style of ['bg-success', 'text-bg-info show', '']) {
      this.assertFalse(NOTIFICATION_SEVERITY_RE.test(`o_notification ${style}`));
    }
    for (const [text, lang] of [
      ['NONE', 'en'],
      ['None.', 'en'],
      ['  none  ', 'en'],
      ['**NONE**', 'en'],
      ['"NONE"', 'en'],
      ['`NONE`', 'en'],
      ['```\nNONE\n```', 'en'],
      ['[NONE]', 'en'],
      ['NONE,', 'en'],
      ['Ninguno.', 'es'],
      ['NADA', 'es'],
      ['**Sin incidencias**', 'es'],
      ['无', 'zh'],
    ])
      this.assertTrue(isNothingReply(text, lang));
    for (const [text, lang] of [
      ["None of the required fields are empty, but the total doesn't match.", 'en'],
      ['Ningún campo requerido está vacío, pero el total no coincide.', 'es'],
      ['Nada más que añadir sobre el descuento del 150%.', 'es'],
    ])
      this.assertFalse(isNothingReply(text, lang));
    this.assertEqual(truncateTail('abcdefgh', 4), '…efgh');
    this.assertEqual(truncateHead('abcdefgh', 4), 'abcd…');
    this.assertEqual(truncateTail('abcd', 4), 'abcd');
    this.assertEqual(truncateHead('abcd', 4), 'abcd');
    const root = new Error('Model not found: re.ds');
    const mid = new Error('Rendering failed', {cause: root});
    const outer = new Error('OWL lifecycle failed', {cause: mid});
    this.assertEqual(
      causeChain(outer).messages.join('\n'),
      'OWL lifecycle failed\nRendering failed\nModel not found: re.ds',
    );
    this.assertEqual(causeChain(outer).stack, root.stack);
    this.assertEqual(
      causeChain({data: {name: 'ValidationError', message: 'Required'}}).messages[0],
      'ValidationError: Required',
    );
    this.assertEqual(causeChain(new Error('OWL', {cause: 'Missing model'})).messages.join('\n'), 'OWL\nMissing model');
    const circular: {message: string, cause?: mixed} = {message: 'circular'};
    circular.cause = circular;
    this.assertEqual(causeChain(circular).messages.length, 1);
  }
}
