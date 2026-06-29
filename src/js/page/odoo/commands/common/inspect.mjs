// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import getOdooRoot from '@odoo/utils/get_odoo_root';
import getActiveModalInfo from '@odoo/utils/get_active_modal_info';
import getUrlInfo from '@odoo/utils/get_url_info';
import getFormRecord from '@odoo/utils/get_form_record';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

const CONTENT_SELECTORS = ['.o_action_manager', '.o_web_client', 'body'];

function getContentRoot(): Element | null {
  for (const sel of CONTENT_SELECTORS) {
    // $FlowFixMe[prop-missing]
    const el = document.querySelector(sel);
    if (el !== null && typeof el !== 'undefined') {
      return el;
    }
  }
  return document.body;
}

// Produces a guaranteed-unique click recipe for a button element.
// Mirrors the exact enumeration logic of the `click` command (same root,
// same exclusion, same text filter) so the -n index never drifts.
function buttonClickRecipe(el: Element, allButtons: $ReadOnlyArray<Element>): string {
  const nameAttr = el.getAttribute('name') ?? '';
  if (nameAttr.length > 0) {
    return `click -s "button[name=\\"${nameAttr}\\"]"`;
  }

  const text = (el.textContent ?? '').trim();
  if (text.length === 0) {
    const cls = el.getAttribute('class') ?? '';
    const firstCls = cls.split(' ').find(c => c.length > 0) ?? '';
    return firstCls.length > 0 ? `click -s ".${firstCls}"` : 'click -s "button"';
  }

  // Count index among all buttons that contain this same text (same logic as `click -t`)
  const lowerText = text.toLowerCase();
  const sameText = allButtons.filter(b => (b.textContent ?? '').trim().toLowerCase().includes(lowerText));
  const idx = sameText.indexOf(el);
  return idx <= 0 ? `click -t "${text}"` : `click -t "${text}" -n ${idx}`;
}

type ButtonInfo = {index: number, text: string, name: string, disabled: boolean, click_cmd: string};
type FieldInfo = {name: string, label: string, type: string, required: boolean, form_cmd: string};
type TabInfo = {index: number, label: string, active: boolean, click_cmd: string};
type MenuInfo = {index: number, text: string, click_cmd: string};
type StatusbarInfo = {index: number, value: string, label: string, current: boolean, disabled: boolean, click_cmd: string};
type ViewInfo = {index: number, type: string, label: string, active: boolean, click_cmd: string};
type DialogInfo = {title: string, buttons: $ReadOnlyArray<ButtonInfo>, fields: $ReadOnlyArray<FieldInfo>} | null;
type BreadcrumbInfo = {index: number, label: string, click_cmd: string};
type RecordFieldInfo = {name: string, value: string};
type PageInfo = {
  title: string,
  url: string,
  breadcrumb: $ReadOnlyArray<string>,
  model: string | void,
  record_id: number | string | void,
  view_type: string | void,
  element_counts: {buttons: number, fields: number, tabs: number, statusbar: number},
};

function collectButtons(root: Element): Array<Element> {
  // $FlowFixMe[prop-missing]
  const nodeList = root.querySelectorAll('button');
  const result: Array<Element> = [];
  nodeList.forEach(el => {
    if (el.closest('.o_terminal') === null) {
      result.push(el);
    }
  });
  return result;
}

function inspectButtons(root: Element): $ReadOnlyArray<ButtonInfo> {
  const all = collectButtons(root);
  return all.map((el, index) => ({
    index,
    text: (el.textContent ?? '').trim(),
    name: el.getAttribute('name') ?? '',
    disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
    click_cmd: buttonClickRecipe(el, all),
  }));
}

function inspectFields(root: Element): $ReadOnlyArray<FieldInfo> {
  // $FlowFixMe[prop-missing]
  const els: $ReadOnlyArray<Element> = Array.from(root.querySelectorAll('.o_field_widget[name]'));
  return els.map(el => {
    const name = el.getAttribute('name') ?? '';
    const typeClass = Array.from(el.classList).find(c => c.startsWith('o_field_') && c !== 'o_field_widget') ?? '';
    const ftype = typeClass.length > 0 ? typeClass.slice('o_field_'.length) : 'unknown';
    const required = el.closest('.o_required_modifier') !== null || el.getAttribute('aria-required') === 'true';

    let label = '';
    // $FlowFixMe[prop-missing]
    const labelEl = document.querySelector(`.o_form_label[for="${name}"], label[for="${name}"]`);
    if (labelEl !== null && typeof labelEl !== 'undefined') {
      label = (labelEl.textContent ?? '').trim();
    }
    if (label.length === 0) {
      const row = el.closest('.o_wrap_field, tr');
      if (row !== null && typeof row !== 'undefined') {
        // $FlowFixMe[prop-missing]
        const labelCell = row.querySelector('.o_form_label, .o_td_label label');
        if (labelCell !== null && typeof labelCell !== 'undefined') {
          label = (labelCell.textContent ?? '').trim();
        }
      }
    }

    return {name, label, type: ftype, required, form_cmd: `form -o get -f ${name}`};
  });
}

function inspectTabs(root: Element): $ReadOnlyArray<TabInfo> {
  // .nav-link covers Bootstrap 4+ (Odoo 12+); li a covers Bootstrap 3 (Odoo 11).
  // $FlowFixMe[prop-missing]
  const nodeList = root.querySelectorAll('.o_notebook .nav-tabs .nav-link, .o_notebook .nav-tabs li a');
  const seen: Set<Element> = new Set();
  const els: Array<Element> = [];
  nodeList.forEach(el => {
    if (!seen.has(el)) {
      seen.add(el);
      els.push(el);
    }
  });
  return els.map((el, index) => {
    const label = (el.textContent ?? '').trim();
    const active = el.classList.contains('active') || el.closest('li')?.classList.contains('active') === true;
    return {
      index,
      label,
      active,
      click_cmd: `click -t "${label}" -s ".o_notebook .nav-link, .o_notebook .nav-tabs li a"`,
    };
  });
}

function inspectMenus(): $ReadOnlyArray<MenuInfo> {
  const MENU_SELECTORS = [
    '.o_main_navbar .o_menu_sections .o_nav_entry',
    '.o_main_navbar .o_menu_sections a',
    '.o_main_navbar .o_menu_sections button',
  ];
  const seen: Set<Element> = new Set();
  const items: Array<Element> = [];
  for (const sel of MENU_SELECTORS) {
    // $FlowFixMe[prop-missing]
    for (const el of document.querySelectorAll(sel)) {
      if (!seen.has(el)) {
        seen.add(el);
        items.push(el);
      }
    }
  }
  return items.map((el, index) => ({
    index,
    text: (el.textContent ?? '').trim(),
    click_cmd: `click -t "${(el.textContent ?? '').trim()}" -s ".o_main_navbar .o_menu_sections a, .o_main_navbar .o_menu_sections button"`,
  }));
}

// Status bar: the clickable state buttons (Draft → Confirmed → Done).
// Selector covers both Odoo 13-15 (.o_statusbar_status button) and 16+ (same).
// The current state carries .o_arrow_button_current or aria-pressed="true".
function inspectStatusbar(root: Element): $ReadOnlyArray<StatusbarInfo> {
  // $FlowFixMe[prop-missing]
  const els: $ReadOnlyArray<Element> = Array.from(root.querySelectorAll('.o_statusbar_status button[data-value]'));
  return els.map((el, index) => {
    const value = el.getAttribute('data-value') ?? '';
    const label = (el.textContent ?? '').trim();
    const current =
      el.classList.contains('o_arrow_button_current') ||
      el.getAttribute('aria-pressed') === 'true' ||
      el.getAttribute('aria-checked') === 'true';
    return {
      index,
      value,
      label,
      current,
      disabled: el.hasAttribute('disabled'),
      click_cmd: `click -s ".o_statusbar_status button[data-value=\\"${value}\\"]"`,
    };
  });
}

// View switcher buttons in the control panel (List, Kanban, Form, …).
// Odoo 16+: .o_switch_view with view-type classes (o_list, o_kanban, …).
// Active view has class .active.
function inspectViews(): $ReadOnlyArray<ViewInfo> {
  const SWITCH_SELECTORS = [
    '.o_cp_switch_buttons .o_switch_view',
    '.o_control_panel .o_switch_view',
  ];
  const seen: Set<Element> = new Set();
  const items: Array<Element> = [];
  for (const sel of SWITCH_SELECTORS) {
    // $FlowFixMe[prop-missing]
    for (const el of document.querySelectorAll(sel)) {
      if (!seen.has(el)) {
        seen.add(el);
        items.push(el);
      }
    }
  }
  return items.map((el, index) => {
    const typeClass = Array.from(el.classList).find(c => c !== 'o_switch_view' && c !== 'active' && c !== 'btn') ?? '';
    const label = (el.getAttribute('title') ?? el.getAttribute('aria-label') ?? el.textContent ?? typeClass).trim();
    return {
      index,
      type: typeClass,
      label,
      active: el.classList.contains('active'),
      click_cmd: typeClass.length > 0 ? `click -s ".o_switch_view.${typeClass}"` : `click -t "${label}" -s ".o_switch_view"`,
    };
  });
}

// Active dialog: title + its own buttons and Odoo field widgets.
// When no dialog is open, returns null.
function inspectDialog(): DialogInfo {
  // Prefer the top-most non-inactive dialog
  // $FlowFixMe[prop-missing]
  const dialogEl = document.querySelector('.o_dialog:not(.o_inactive_modal) .modal-dialog, .modal.show .modal-dialog');
  if (dialogEl === null || typeof dialogEl === 'undefined') {
    return null;
  }
  // $FlowFixMe[prop-missing]
  const titleEl = dialogEl.querySelector('.modal-title, .o_dialog_title');
  const title = titleEl !== null && typeof titleEl !== 'undefined' ? (titleEl.textContent ?? '').trim() : '';
  return {
    title,
    buttons: inspectButtons(dialogEl),
    fields: inspectFields(dialogEl),
  };
}

// Breadcrumb navigation links: clicking goes back to a previous view.
function inspectBreadcrumb(): $ReadOnlyArray<BreadcrumbInfo> {
  const BREADCRUMB_SELECTORS = [
    '.o_breadcrumb .o_back_button',
    '.o_breadcrumb a',
    '.o_breadcrumb button',
    '.o_breadcrumb .breadcrumb-item',
  ];
  const seen: Set<Element> = new Set();
  const items: Array<Element> = [];
  for (const sel of BREADCRUMB_SELECTORS) {
    // $FlowFixMe[prop-missing]
    for (const el of document.querySelectorAll(sel)) {
      if (!seen.has(el) && el.closest('.o_terminal') === null) {
        seen.add(el);
        items.push(el);
      }
    }
  }
  return items.map((el, index) => {
    const label = (el.textContent ?? '').trim();
    return {
      index,
      label,
      click_cmd: `click -t "${label}" -s ".o_breadcrumb"`,
    };
  });
}

// Current form record values: reads in-memory data for every field visible in the DOM.
async function inspectRecord(root: Element): Promise<$ReadOnlyArray<RecordFieldInfo>> {
  const adapter = getFormRecord();
  if (adapter === null) {
    return [];
  }
  const fieldNames: Array<string> = [];
  const seen: Set<string> = new Set();
  // $FlowFixMe[prop-missing]
  root.querySelectorAll('.o_field_widget[name]').forEach(el => {
    const name = el.getAttribute('name') ?? '';
    if (name.length > 0 && !seen.has(name)) {
      seen.add(name);
      fieldNames.push(name);
    }
  });
  const values = adapter.read(fieldNames);
  return fieldNames.map(name => {
    const raw = values[name];
    let display: string;
    if (raw === null || raw === undefined) {
      display = '';
    } else if (Array.isArray(raw) && raw.length === 2) {
      // many2one: [id, display_name]
      display = String(raw[1] ?? raw[0]);
    } else if (typeof raw === 'object') {
      display = JSON.stringify(raw);
    } else {
      display = String(raw);
    }
    return {name, value: display};
  });
}

function inspectPage(root: Element): PageInfo {
  // $FlowFixMe[prop-missing]
  const breadcrumbEls = document.querySelectorAll('.o_breadcrumb .breadcrumb-item, .o_breadcrumb span');
  const breadcrumb: Array<string> = Array.from(breadcrumbEls)
    .map(el => (el.textContent ?? '').trim())
    .filter(t => t.length > 0);

  let model: string | void;
  let record_id: number | string | void;
  let view_type: string | void;

  const modal = getActiveModalInfo();
  if (modal !== null) {
    model = modal.model;
    record_id = modal.id;
  } else {
    try {
      const actionService = getOdooRoot()?.actionService?.currentController;
      if (typeof actionService !== 'undefined' && actionService !== null) {
        // $FlowFixMe[prop-missing]
        model = actionService.props?.resModel ?? undefined;
        // $FlowFixMe[prop-missing]
        record_id = actionService.props?.resId ?? undefined;
        // $FlowFixMe[prop-missing]
        view_type = actionService.view?.type ?? undefined;
      }
    } catch (_e) {
      // older Odoo — fall through to URL hash
    }
    if (typeof model === 'undefined') {
      model = getUrlInfo('hash', 'model');
      const rawId = getUrlInfo('hash', 'id');
      record_id = rawId !== undefined ? Number(rawId) : undefined;
    }
  }

  // $FlowFixMe[prop-missing]
  const buttons = Array.from(root.querySelectorAll('button')).filter(el => el.closest('.o_terminal') === null).length;
  // $FlowFixMe[prop-missing]
  const fields = root.querySelectorAll('.o_field_widget[name]').length;
  // $FlowFixMe[prop-missing]
  const tabs = root.querySelectorAll('.o_notebook .nav-tabs .nav-link').length;
  // $FlowFixMe[prop-missing]
  const statusbar = root.querySelectorAll('.o_statusbar_status button[data-value]').length;

  return {
    title: document.title ?? '',
    url: window.location.href,
    breadcrumb,
    model,
    record_id,
    view_type,
    element_counts: {buttons, fields, tabs, statusbar},
  };
}

async function cmdInspect(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
  // TraSH converts hyphens to underscores in kwarg keys (type-element → type_element)
  const typeEl: string = typeof kwargs.type_element === 'string' ? kwargs.type_element : 'page';

  if (typeEl === 'page') {
    const root = getContentRoot();
    if (root === null) {
      ctx.screen.printError(i18n.t('cmdInspect.error.noRoot', 'Cannot find Odoo content area'));
      return;
    }
    const info = inspectPage(root);
    ctx.screen.print(`<strong>${i18n.t('cmdInspect.page.title', 'Page Overview')}</strong>`);
    ctx.screen.print(i18n.t('cmdInspect.page.pageTitle', 'Title: <em>{{title}}</em>', {title: info.title}));
    ctx.screen.print(i18n.t('cmdInspect.page.url', 'URL: {{url}}', {url: info.url}));
    if (info.breadcrumb.length > 0) {
      ctx.screen.print(i18n.t('cmdInspect.page.breadcrumb', 'Breadcrumb: {{path}}', {path: info.breadcrumb.join(' › ')}));
    }
    if (typeof info.model === 'string') {
      ctx.screen.print(i18n.t('cmdInspect.page.model', 'Model: <strong>{{model}}</strong>', {model: info.model}));
    }
    if (typeof info.record_id !== 'undefined') {
      ctx.screen.print(i18n.t('cmdInspect.page.recordId', 'Record ID: <strong>{{id}}</strong>', {id: String(info.record_id)}));
    }
    if (typeof info.view_type === 'string') {
      ctx.screen.print(i18n.t('cmdInspect.page.viewType', 'View type: {{type}}', {type: info.view_type}));
    }
    ctx.screen.print(
      i18n.t('cmdInspect.page.counts', 'Elements — buttons: {{b}}, fields: {{f}}, tabs: {{t}}, statusbar states: {{s}}', {
        b: info.element_counts.buttons,
        f: info.element_counts.fields,
        t: info.element_counts.tabs,
        s: info.element_counts.statusbar,
      }),
    );
    return info;
  }

  if (typeEl === 'button') {
    const root = getContentRoot();
    if (root === null) {
      ctx.screen.printError(i18n.t('cmdInspect.error.noRoot', 'Cannot find Odoo content area'));
      return;
    }
    const items = inspectButtons(root);
    if (items.length === 0) {
      ctx.screen.print(i18n.t('cmdInspect.button.none', 'No buttons found in the current view'));
      return items;
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdInspect.table.index', '#'),
        i18n.t('cmdInspect.table.text', 'Text'),
        i18n.t('cmdInspect.table.name', 'name attr'),
        i18n.t('cmdInspect.table.disabled', 'Dis.'),
        i18n.t('cmdInspect.table.clickCmd', 'click command'),
      ],
      items.map(b => [String(b.index), b.text, b.name, b.disabled ? '✓' : '', b.click_cmd]),
      '',
    );
    return items;
  }

  if (typeEl === 'field') {
    const root = getContentRoot();
    if (root === null) {
      ctx.screen.printError(i18n.t('cmdInspect.error.noRoot', 'Cannot find Odoo content area'));
      return;
    }
    const items = inspectFields(root);
    if (items.length === 0) {
      ctx.screen.print(i18n.t('cmdInspect.field.none', 'No form fields found in the current view'));
      return items;
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdInspect.table.name', 'name attr'),
        i18n.t('cmdInspect.table.label', 'Label'),
        i18n.t('cmdInspect.table.type', 'Type'),
        i18n.t('cmdInspect.table.required', 'Req'),
        i18n.t('cmdInspect.table.formCmd', 'form command'),
      ],
      items.map(f => [f.name, f.label, f.type, f.required ? '✓' : '', f.form_cmd]),
      '',
    );
    return items;
  }

  if (typeEl === 'tab') {
    const root = getContentRoot();
    if (root === null) {
      ctx.screen.printError(i18n.t('cmdInspect.error.noRoot', 'Cannot find Odoo content area'));
      return;
    }
    const items = inspectTabs(root);
    if (items.length === 0) {
      ctx.screen.print(i18n.t('cmdInspect.tab.none', 'No notebook tabs found in the current view'));
      return items;
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdInspect.table.index', '#'),
        i18n.t('cmdInspect.table.label', 'Label'),
        i18n.t('cmdInspect.table.active', 'Active'),
        i18n.t('cmdInspect.table.clickCmd', 'click command'),
      ],
      items.map(t => [String(t.index), t.label, t.active ? '✓' : '', t.click_cmd]),
      '',
    );
    return items;
  }

  if (typeEl === 'menu') {
    const items = inspectMenus();
    if (items.length === 0) {
      ctx.screen.print(i18n.t('cmdInspect.menu.none', 'No menu items found'));
      return items;
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdInspect.table.index', '#'),
        i18n.t('cmdInspect.table.text', 'Text'),
        i18n.t('cmdInspect.table.clickCmd', 'click command'),
      ],
      items.map(m => [String(m.index), m.text, m.click_cmd]),
      '',
    );
    return items;
  }

  if (typeEl === 'statusbar') {
    const root = getContentRoot();
    if (root === null) {
      ctx.screen.printError(i18n.t('cmdInspect.error.noRoot', 'Cannot find Odoo content area'));
      return;
    }
    const items = inspectStatusbar(root);
    if (items.length === 0) {
      ctx.screen.print(i18n.t('cmdInspect.statusbar.none', 'No status bar found in the current view'));
      return items;
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdInspect.table.value', 'Value'),
        i18n.t('cmdInspect.table.label', 'Label'),
        i18n.t('cmdInspect.table.current', 'Current'),
        i18n.t('cmdInspect.table.disabled', 'Dis.'),
        i18n.t('cmdInspect.table.clickCmd', 'click command'),
      ],
      items.map(s => [s.value, s.label, s.current ? '✓' : '', s.disabled ? '✓' : '', s.click_cmd]),
      '',
    );
    return items;
  }

  if (typeEl === 'view') {
    const items = inspectViews();
    if (items.length === 0) {
      ctx.screen.print(i18n.t('cmdInspect.view.none', 'No view switcher found (may be single-view action)'));
      return items;
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdInspect.table.type', 'Type'),
        i18n.t('cmdInspect.table.label', 'Label'),
        i18n.t('cmdInspect.table.active', 'Active'),
        i18n.t('cmdInspect.table.clickCmd', 'click command'),
      ],
      items.map(v => [v.type, v.label, v.active ? '✓' : '', v.click_cmd]),
      '',
    );
    return items;
  }

  if (typeEl === 'dialog') {
    const info = inspectDialog();
    if (info === null) {
      ctx.screen.print(i18n.t('cmdInspect.dialog.none', 'No dialog is currently open'));
      return null;
    }
    ctx.screen.print(
      i18n.t('cmdInspect.dialog.title', 'Dialog: <strong>{{title}}</strong>', {title: info.title || '(no title)'}),
    );
    if (info.buttons.length > 0) {
      ctx.screen.print(i18n.t('cmdInspect.dialog.buttons', '<em>Buttons:</em>'));
      ctx.screen.printTable(
        [
          i18n.t('cmdInspect.table.index', '#'),
          i18n.t('cmdInspect.table.text', 'Text'),
          i18n.t('cmdInspect.table.name', 'name attr'),
          i18n.t('cmdInspect.table.disabled', 'Dis.'),
          i18n.t('cmdInspect.table.clickCmd', 'click command'),
        ],
        info.buttons.map(b => [String(b.index), b.text, b.name, b.disabled ? '✓' : '', b.click_cmd]),
        '',
      );
    }
    if (info.fields.length > 0) {
      ctx.screen.print(i18n.t('cmdInspect.dialog.fields', '<em>Fields:</em>'));
      ctx.screen.printTable(
        [
          i18n.t('cmdInspect.table.name', 'name attr'),
          i18n.t('cmdInspect.table.label', 'Label'),
          i18n.t('cmdInspect.table.type', 'Type'),
          i18n.t('cmdInspect.table.required', 'Req'),
          i18n.t('cmdInspect.table.formCmd', 'form command'),
        ],
        info.fields.map(f => [f.name, f.label, f.type, f.required ? '✓' : '', f.form_cmd]),
        '',
      );
    }
    return info;
  }

  if (typeEl === 'breadcrumb') {
    const items = inspectBreadcrumb();
    if (items.length === 0) {
      ctx.screen.print(i18n.t('cmdInspect.breadcrumb.none', 'No breadcrumb navigation found'));
      return items;
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdInspect.table.index', '#'),
        i18n.t('cmdInspect.table.label', 'Label'),
        i18n.t('cmdInspect.table.clickCmd', 'click command'),
      ],
      items.map(b => [String(b.index), b.label, b.click_cmd]),
      '',
    );
    return items;
  }

  if (typeEl === 'record') {
    const root = getContentRoot();
    if (root === null) {
      ctx.screen.printError(i18n.t('cmdInspect.error.noRoot', 'Cannot find Odoo content area'));
      return;
    }
    const items = await inspectRecord(root);
    if (items.length === 0) {
      ctx.screen.print(i18n.t('cmdInspect.record.none', 'No form record found in the current view'));
      return items;
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdInspect.table.name', 'Field'),
        i18n.t('cmdInspect.table.value', 'Value'),
      ],
      items.map(r => [r.name, r.value]),
      '',
    );
    return items;
  }

  ctx.screen.printError(
    i18n.t('cmdInspect.error.unknownType', 'Unknown element type: {{type}}', {type: typeEl}),
  );
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdInspect.definition', 'Inspect interactive elements on the current page'),
    callback: cmdInspect,
    detail: i18n.t(
      'cmdInspect.detail',
      'Lists elements of the given type with the terminal command to interact with each one. For LLM use: call inspect first, then use the generated commands.\n' +
      'Types:\n' +
      '  page (default) — context overview: model, record id, view type, element counts\n' +
      '  button — all buttons with a ready-to-use "click" command\n' +
      '  field — Odoo form fields with a "form" command\n' +
      '  tab — notebook tabs with a "click" command\n' +
      '  menu — top navbar menu items with a "click" command\n' +
      '  statusbar — workflow state buttons with a "click" command\n' +
      '  view — view switcher (list/kanban/form/…) with a "click" command\n' +
      '  dialog — buttons and fields of the currently open dialog\n' +
      '  breadcrumb — back-navigation links with a "click" command\n' +
      '  record — current form record field values (in-memory)',
    ),
    args: [
      [
        ARG.String,
        ['e', 'type-element'],
        false,
        i18n.t('cmdInspect.args.typeElement', 'Element type to inspect'),
        'page',
        ['page', 'button', 'field', 'tab', 'menu', 'statusbar', 'view', 'dialog', 'breadcrumb', 'record'],
      ],
    ],
    example: '-e button',
  };
}
