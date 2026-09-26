// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import TerminalTestSuite from './tests';
import asyncSleep from '@terminal/utils/async_sleep';
import keyCode from '@terminal/utils/keycode';
import describeCommandError from '@ai/utils/describe_command_error';
import Shell from '@terminal/shell';
import {SETTING_DEFAULTS} from '@common/constants';
import {registerTime} from '@tardo/trash-stdlib';
import ExecutionStoppedError from '@tardo/trash/exceptions/execution_stopped_error';
import type {EvalOptions} from '@tardo/trash/vmachine';

export default class TestCore extends TerminalTestSuite {
  _orig_context: {[string]: mixed} = {};
  // Can't test 'exportfile' because required user interaction

  /**
   * @override
   */
  async onBeforeTest(test_name: string): Promise<string> {
    const res = await super.onBeforeTest(arguments);
    if (test_name === 'test_context_term') {
      const context = await this.terminal.execute('context_term', false, true);
      this._orig_context = context;
    }
    return res;
  }

  /**
   * @override
   */
  async onAfterTest(test_name: string): Promise<string> {
    const res = super.onAfterTest(arguments);
    if (test_name === 'test_context_term') {
      return this.terminal.execute(`context_term -o set -v ${JSON.stringify(this._orig_context)}`, false, true);
    }
    return res;
  }

  async test_call_not_named_args() {
    let res =
      await this.terminal.execute('alias test "print -m \'This is a test! $1 ($2[Nothing])\'"', false, true);
    this.assertIn(res, 'test');
    res =
      await this.terminal.execute('alias testB -c "print -m \'This is a test! $1 ($2[Nothing])\'"', false, true);
    this.assertIn(res, 'testB');
  }

  async test_help() {
    await this.terminal.execute('help', false, true);
    await this.terminal.execute('help -c search', false, true);
    await this.terminal.execute('help search', false, true);
    const res = await this.terminal.execute('help --category stdlib', false, true);
    this.assertTrue(res.includes('arr_map'));
    const doubled = await this.terminal.execute(
      '$doubled = (arr_map [1,2] (function (item) { return $item * 2 })); $doubled',
      false,
      true,
    );
    this.assertEqual(doubled[1], 4);
  }

  async test_execution_controls() {
    const shell = new Shell({invokeExternalCommand: async () => null});
    shell.getVM().use(registerTime);
    shell.configureExecution({...SETTING_DEFAULTS, execution_max_instructions: 20});
    let stopped = false;
    try {
      await shell.eval('for ($i = 0; $i < 100; $i++) { $i }');
    } catch (err) {
      stopped = err instanceof ExecutionStoppedError;
    }
    this.assertTrue(stopped, 'Instruction budget must stop execution');
    this.assertEqual(await shell.eval('42'), 42);

    shell.configureExecution({...SETTING_DEFAULTS, execution_timeout: 10});
    stopped = false;
    try {
      await shell.eval('silent sleep 1000');
    } catch (err) {
      stopped = err instanceof ExecutionStoppedError;
    }
    this.assertTrue(stopped, 'Silent execution must propagate cancellation');
    this.assertEmpty(shell.getActiveJobs());
    this.assertEqual(await shell.eval('42'), 42);

    for (const [limits, source] of [
      [{execution_max_source_length: 4}, '12345'],
      [{execution_max_nesting_depth: 4}, '[[[[[1]]]]]'],
      [{execution_max_collection_length: 4}, '[1,2,3,4,5]'],
      [{execution_max_string_length: 4}, '"abc" + "def"'],
    ]) {
      shell.configureExecution({...SETTING_DEFAULTS, ...limits});
      let rejected = false;
      try {
        await shell.eval(source);
      } catch (_err) {
        rejected = true;
      }
      this.assertTrue(rejected, `${JSON.stringify(limits)} must be enforced`);
    }

    // Every individual chrono fits, but the combined nested execution does not.
    stopped = false;
    try {
      await this.terminal.execute(
        'for ($i = 0; $i < 10; $i++) { chrono "for ($j = 0; $j < 10; $j++) { $j }" }',
        false, true, true, false, {silent: true, maxInstructions: 300},
      );
    } catch (err) {
      stopped = err instanceof ExecutionStoppedError;
    }
    this.assertTrue(stopped, 'Nested host calls must share the instruction budget');

    await this.terminal.execute('alias test_budget "for ($j = 0; $j < 10; $j++) { $j }"', false, true);
    try {
      stopped = false;
      try {
        await this.terminal.execute(
          'for ($i = 0; $i < 10; $i++) { test_budget }',
          false, true, true, false,
          {silent: true, maxInstructions: 300, aliases: {test_budget: 'for ($j = 0; $j < 10; $j++) { $j }'}},
        );
      } catch (err) {
        stopped = err instanceof ExecutionStoppedError;
      }
      this.assertTrue(stopped, 'Aliases must share the instruction budget');
    } finally {
      await this.terminal.execute('alias -n test_budget', false, true);
    }
  }

  async test_terminal_execution_limits_reset() {
    const options: EvalOptions = {maxInstructions: 10, silent: true};
    for (let i = 0; i < 2; i++) {
      this.assertEqual(await this.terminal.execute('1 + 2 + 3 + 4 + 5', false, true, false, false, options), 15);
    }
    let stopped = false;
    try {
      await this.terminal.execute('for ($i = 0; $i < 100; $i++) { $i }', false, true, false, false, options);
    } catch (err) {
      stopped = err instanceof ExecutionStoppedError;
    }
    this.assertTrue(stopped);
    this.assertEqual(await this.terminal.execute('1 + 2 + 3 + 4 + 5', false, true, false, false, options), 15);
  }

  async test_reload_shell() {
    const shell = this.terminal.getShell();
    const previousVM = shell.getVM();
    await shell.eval('$reload_probe = 42');
    await shell.eval('function reload_probe_fn() { return 7 }');
    this.assertTrue(Object.hasOwn(previousVM.getRegisteredCmds(), 'reload_probe_fn'));
    const reloadButton = this.terminal.el.querySelector('.terminal-screen-icon-reload-shell');
    this.assertTrue(reloadButton instanceof HTMLElement);
    if (reloadButton instanceof HTMLElement) reloadButton.click();

    this.assertNotEqual(shell.getVM(), previousVM);
    this.assertEqual(shell.getVM().options.maxInstructions, previousVM.options.maxInstructions);
    this.assertTrue(Object.hasOwn(shell.getVM().getRegisteredCmds(), 'help'));
    this.assertTrue(Object.hasOwn(shell.getVM().getRegisteredCmds(), 'arr_map'));
    this.assertTrue(!Object.hasOwn(shell.getVM().getRegisteredCmds(), 'reload_probe_fn'));
    let missing = false;
    try {
      await shell.eval('$reload_probe');
    } catch (_err) {
      missing = true;
    }
    this.assertTrue(missing, 'Reload must discard VM globals');
  }

  async test_print() {
    const res = await this.terminal.execute("print -m 'This is a test!'", false, true);
    this.assertEqual(res, 'This is a test!');
  }

  async test_dis() {
    const rows = await this.terminal.execute('dis -c "print -m 42"', false, true);
    this.assertTrue(rows.some(row => row[0] === 'LOAD_CONST' && row[2] === '42' && row[5] === '42'));
  }

  async test_load() {
    const res =
      await this.terminal.execute(
        "load -u 'https://cdnjs.cloudflare.com/ajax/libs/Mock.js/1.0.0/mock-min.js'",
        false,
        true,
      );
    this.assertTrue(res !== null && typeof res !== 'undefined');
  }

  async test_context_term() {
    let res = await this.terminal.execute('context_term', false, true);
    this.assertIn(res, 'active_test');
    res = await this.terminal.execute('context_term -o read', false, true);
    this.assertIn(res, 'active_test');
    res = await this.terminal.execute("context_term -o write -v {test_key: 'test_value'}", false, true);
    this.assertIn(res, 'test_key');
    res = await this.terminal.execute("context_term -o set -v {test_key: 'test_value_change'}", false, true);
    this.assertEqual(res.test_key, 'test_value_change');
    res = await this.terminal.execute('context_term -o delete -v test_key', false, true);
    this.assertNotIn(res, 'test_key');
  }

  async test_alias() {
    let res = await this.terminal.execute('alias', false, true);
    // This.assertEmpty(res);
    res = (
      await this.terminal.execute('alias -n test -c "print -m \'This is a test! $1 ($2[Nothing])\'"', false, true)
    );
    this.assertIn(res, 'test');
    res = await this.terminal.execute('test Foo "Bar Space"', false, true);
    this.assertEqual(res, 'This is a test! Foo (Bar Space)');
    res = await this.terminal.execute('test Foo', false, true);
    this.assertEqual(res, 'This is a test! Foo (Nothing)');
    res = await this.terminal.execute('alias -n test', false, true);
    this.assertNotIn(res, 'test');
  }

  async test_toggle_term() {
    await this.terminal.execute('toggle_term -f show', false, true);
    await this.terminal.execute('toggle_term', false, true);
    this.assertFalse(this.terminal.el.classList.contains('terminal-transition-topdown'));
    await this.terminal.execute('toggle_term', false, true);
    this.assertTrue(this.terminal.el.classList.contains('terminal-transition-topdown'));
  }

  async test_exportvar() {
    const res = await this.terminal.execute("exportvar -v (print 'This is a test')", false, true);
    this.assertTrue(Object.hasOwn(window, res));
    this.assertEqual(window[res], 'This is a test');
  }

  async test_chrono() {
    const res = await this.terminal.execute('chrono -c "print -m \'This is a test\'"', false, true);
    this.assertNotEqual(res, -1);
  }

  async test_jobs() {
    const res = await this.terminal.execute('jobs', false, true);
    this.assertEqual(res[0]?.cmdInfo.cmdName, 'jobs');
  }

  async test_gen() {
    let res = await this.terminal.execute('gen -t str -mi 4 -ma 4', false, true);
    this.assertEqual(res.length, 4);
    res = await this.terminal.execute('gen -t int -mi 5 -ma 10', false, true);
    this.assertTrue(res >= 5 && res <= 10);
    res = await this.terminal.execute('gen -t float -mi 5 -ma 10', false, true);
    this.assertTrue(res >= 5.0 && res < 11.0);
    res = await this.terminal.execute('gen -t intseq -mi 5 -ma 10', false, true);
    this.assertEqual(res[0], 5);
    this.assertEqual(res[5], 10);
    res = await this.terminal.execute('gen -t date -mi 500000000 -ma 500000000', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('gen -t tzdate -mi 500000000 -ma 500000000', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('gen -t time -mi 500000000 -ma 500000000', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('gen -t tztime -mi 500000000 -ma 500000000', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('gen -t datetime -mi 500000000 -ma 500000000', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('gen -t tzdatetime -mi 500000000 -ma 500000000', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('gen -t email -mi 8 -ma 15', false, true);
    this.assertTrue(res.indexOf('@') > 0);
    res = await this.terminal.execute('gen -t url -mi 8 -ma 15', false, true);
    this.assertTrue(res.startsWith('https://www.'));
  }

  async test_now() {
    let res = await this.terminal.execute('now', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('now -t date', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('now -t time', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('now -t date --tz', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('now -t time --tz', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = await this.terminal.execute('now -t full --tz', false, true);
    this.assertTrue(res !== null && typeof res !== 'undefined');
  }

  async test_commit() {
    await this.terminal.execute("$rs = (read res.partner 8); $rs['name'] = 'Willy Wonka';", false, true);
    let res = await this.terminal.execute('$rs', false, true);
    this.assertNotEmpty(res.toWrite());
    res = await this.terminal.execute('commit $rs', false, true);
    this.assertTrue(res);
    res = await this.terminal.execute('$rs', false, true);
    this.assertEmpty(res.toWrite());
    res = await this.terminal.execute('read res.partner 8 -f name', false, true);
    this.assertEqual(res.name, 'Willy Wonka');
  }

  async test_rollback() {
    await this.terminal.execute("$rsb = (read res.partner 8); $rsb['name'] = 'Willy Wonka';", false, true);
    const res = await this.terminal.execute('$rsb', false, true);
    this.assertNotEmpty(res.toWrite());
    await this.terminal.execute('rollback $rsb', false, true);
    this.assertEmpty(res.toWrite());
  }

  async test_input() {
    const red_prom = this.terminal.execute("$ind = (input 'test:'); $ind;", false, true);
    await asyncSleep(300);
    const input_el = this.terminal.screen.getUserInputEl();
    this.assertFalse(typeof input_el === 'undefined');
    // $FlowFixMe[incompatible-use]
    input_el.value = "testing!";
    this.terminal.screen.focus();
    // $FlowFixMe[incompatible-use]
    input_el.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter',
      keyCode: keyCode.ENTER,
    }));
    const res = await red_prom;
    this.assertEqual(res, "testing!");
  }

  async test_describe_command_error() {
    // Odoo RPCError: ProcessJobError.data = original error, whose own '.data' is Odoo's
    // exception dict — the real business error the AI agent needs to see and self-correct on.
    this.assertEqual(
      describeCommandError({
        data: {
          message: 'Odoo Server Error',
          data: {name: 'UserError', message: 'You cannot do X', debug: 'Traceback...'},
        },
      }),
      'UserError: You cannot do X: Traceback...',
    );
    // Plain JS Error thrown by a command (no Odoo '.data' shape) — falls back to its message.
    this.assertEqual(describeCommandError({data: new Error('boom')}), 'Error: boom');
    // No '.data' at all (e.g. UnknownCommandError, InvalidCommandArgumentFormatError).
    this.assertEqual(describeCommandError({message: 'Unknown Command x'}), 'Unknown Command x');
  }
}
