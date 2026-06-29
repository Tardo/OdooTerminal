// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import asyncSleep from '@terminal/utils/async_sleep';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import TerminalTestSuite from './tests';

export default class TestBackend extends TerminalTestSuite {
  async test_pivot() {
    await this.terminal.execute('pivot -m res.partner', false, true);
    await asyncSleep(2500);
    this.assertNotEqual(document.querySelector('.o_pivot_view, .o_pivot'), null);
  }

  async test_graph() {
    await this.terminal.execute('graph -m res.partner', false, true);
    await asyncSleep(2500);
    this.assertNotEqual(document.querySelector('.o_graph_view, .o_graph'), null);
  }

  async test_form() {
    await this.terminal.execute('view -m res.company -i 1', false, true);
    await asyncSleep(2500);
    this.assertTrue(this.isFormOpen());
    await this.terminal.execute('form -o highlight -f name', false, true);
    this.assertNotEqual(document.getElementById('oterm-highlight-f-name'), null);
    await this.terminal.execute('form -o clear', false, true);
    this.assertEqual(document.getElementById('oterm-highlight-f-name'), null);

    // get: read current in-memory field values from the open form.
    const getResult: mixed = await this.terminal.execute('form -o get -f [name]', false, true);
    this.assertNotEqual(getResult, null);
    this.assertTrue(typeof getResult === 'object' && !Array.isArray(getResult));
    // $FlowFixMe[invalid-in-rhs]
    this.assertTrue('name' in getResult);

    // The command enters edit mode automatically if needed, then sets the value
    // in-memory (fires onchanges, does not save to DB).
    await this.terminal.execute('form -o edit -v {phone: "test-form-edit-555"}', false, true);
    await asyncSleep(1000);

    // In Odoo 14+, the phone field renders as an <input> in the DOM when in edit
    // mode. In Odoo 11-13 the field may live in an inactive notebook tab that is
    // never added to the DOM, so we only assert the visible input for 14+.
    const odooMajor = getOdooVersion('major');
    if (typeof odooMajor === 'number' && odooMajor >= 14) {
      const phoneInput = document.querySelector('.o_field_widget[name="phone"] input');
      this.assertNotEqual(phoneInput, null);
      // $FlowFixMe[prop-missing]
      this.assertEqual(phoneInput?.value, 'test-form-edit-555');
    }

    // Discard so the DB record is not modified
    const discardBtn = document.querySelector(
      '.o_form_button_cancel, .o_form_discard_button, .o_form_button_cancel.btn',
    );
    if (discardBtn instanceof HTMLElement) {
      discardBtn.click();
      await asyncSleep(500);
    }

    // Save test: form is clean after discard; OWL records skip the write when
    // not dirty, legacy forms may reload in-place — both should succeed.
    await this.terminal.execute('form -o save', false, true);
    await asyncSleep(1500);
  }

  async test_settings() {
    await this.terminal.execute('settings', false, true);
    await asyncSleep(2000);
    this.assertNotEqual(document.querySelector('.o_form_view .settings, .o_form_view > .settings'), null);
  }

  async test_view() {
    await this.terminal.execute('view -m res.company', false, true);
    await asyncSleep(2500);
    const modal_el = this.getModalOpen();
    this.assertTrue(this.isModalType(modal_el, 'list'));
    this.closeModal(modal_el);
    await this.terminal.execute('view -m res.company -i 1', false, true);
    await asyncSleep(2500);
    this.assertTrue(this.isFormOpen());
    await this.terminal.execute('view -m res.company -i 1 -r base.base_onboarding_company_form', false, true);
    await asyncSleep(2500);
    this.assertTrue(this.isFormOpen());
  }

  async test_effect() {
    await this.terminal.execute("effect -t rainbow_man -o {message: 'I hope everything works correctly'}", false, true);
  }

  async test_click() {
    await this.terminal.execute('view -m res.company -i 1', false, true);
    await asyncSleep(2500);
    this.assertTrue(this.isFormOpen(), 'click: form not open after navigation');

    // list mode: count all buttons in the view — must be > 0 (always has buttons)
    const total: mixed = await this.terminal.execute('click -l', false, true);
    this.assertTrue(typeof total === 'number' && total > 0, `click: click -l returned ${String(total)}, expected number > 0`);

    // cross-check: inspect -e button must produce a valid click recipe for the first button
    const buttons: mixed = await this.terminal.execute('inspect -e button', false, true);
    this.assertTrue(Array.isArray(buttons) && buttons.length > 0, `click: inspect -e button returned empty/non-array: ${String(buttons)}`);
    if (Array.isArray(buttons) && buttons.length > 0) {
      const btn = buttons[0];
      // $FlowFixMe[incompatible-use]
      const clickCmd: mixed = btn.click_cmd;
      // $FlowFixMe[incompatible-use]
      const btnIndex: mixed = btn.index;
      // $FlowFixMe[incompatible-use]
      const btnText: mixed = btn.text;
      this.assertTrue(typeof clickCmd === 'string' && clickCmd.startsWith('click'), `click: click_cmd is not a 'click' string: ${String(clickCmd)}`);
      this.assertTrue(typeof btnIndex === 'number', `click: btn.index is not a number: ${String(btnIndex)}`);
      this.assertTrue(typeof btnText === 'string', `click: btn.text is not a string: ${String(btnText)}`);
      if (typeof clickCmd === 'string') {
        // Append --list to verify the selector without side effects
        const listResult: mixed = await this.terminal.execute(clickCmd + ' -l', false, true);
        this.assertTrue(typeof listResult === 'number' || listResult === undefined, `click: recipe list returned unexpected: ${String(listResult)}`);
      }
    }

    // click a notebook tab if inactive ones exist — non-destructive DOM action
    const tabs: mixed = await this.terminal.execute('inspect -e tab', false, true);
    if (Array.isArray(tabs) && tabs.length > 1) {
      let inactiveTabCmd: string = '';
      tabs.forEach(t => {
        if (inactiveTabCmd.length === 0 && typeof t === 'object' && t !== null) {
          // $FlowFixMe[incompatible-use]
          const tabActive: mixed = t.active;
          // $FlowFixMe[incompatible-use]
          const tabCmd: mixed = t.click_cmd;
          if (tabActive === false && typeof tabCmd === 'string') {
            inactiveTabCmd = tabCmd;
          }
        }
      });
      if (inactiveTabCmd.length > 0) {
        const clicked: mixed = await this.terminal.execute(inactiveTabCmd, false, true);
        this.assertEqual(clicked, 1);
      }
    }
  }

  async test_inspect() {
    // --- page overview: works on any authenticated Odoo page ---
    const pageInfo: mixed = await this.terminal.execute('inspect', false, true);
    this.assertTrue(typeof pageInfo === 'object' && pageInfo !== null && !Array.isArray(pageInfo), `inspect: page info is not an object: ${String(pageInfo)}`);
    // $FlowFixMe[invalid-in-rhs]
    this.assertTrue('url' in pageInfo && 'element_counts' in pageInfo, 'inspect: page info missing url or element_counts');
    // $FlowFixMe[incompatible-use]
    const pageUrl: mixed = pageInfo.url;
    this.assertTrue(typeof pageUrl === 'string' && pageUrl.length > 0, `inspect: page url is not a non-empty string: ${String(pageUrl)}`);

    // --- menu: navbar menu items (may be empty in Odoo 11 if selectors miss) ---
    const menus: mixed = await this.terminal.execute('inspect -e menu', false, true);
    this.assertTrue(Array.isArray(menus), `inspect: menus is not an array: ${String(menus)}`);

    // --- dialog: null when no dialog is open ---
    const noDialog: mixed = await this.terminal.execute('inspect -e dialog', false, true);
    this.assertTrue(noDialog === null, `inspect: expected null dialog, got: ${String(noDialog)}`);

    // Navigate to res.company form for form-specific inspection types
    await this.terminal.execute('view -m res.company -i 1', false, true);
    await asyncSleep(2500);
    this.assertTrue(this.isFormOpen(), 'inspect: form not open after navigation');

    // --- button: form always has buttons (Save/Discard/Edit etc.) ---
    const buttons: mixed = await this.terminal.execute('inspect -e button', false, true);
    this.assertTrue(Array.isArray(buttons) && buttons.length > 0, `inspect: expected non-empty button array, got: ${String(buttons)}`);
    if (Array.isArray(buttons) && buttons.length > 0) {
      const btn = buttons[0];
      // $FlowFixMe[incompatible-use]
      const btnClickCmd: mixed = btn.click_cmd;
      // $FlowFixMe[incompatible-use]
      const btnIndex: mixed = btn.index;
      // $FlowFixMe[incompatible-use]
      const btnDisabled: mixed = btn.disabled;
      this.assertTrue(typeof btnClickCmd === 'string' && btnClickCmd.startsWith('click'), `inspect: btn.click_cmd is not a click string: ${String(btnClickCmd)}`);
      this.assertTrue(typeof btnIndex === 'number', `inspect: btn.index is not a number: ${String(btnIndex)}`);
      this.assertTrue(typeof btnDisabled === 'boolean', `inspect: btn.disabled is not a boolean: ${String(btnDisabled)}`);
    }

    // --- field: res.company form always exposes field widgets (.o_field_widget[name]) ---
    const fields: mixed = await this.terminal.execute('inspect -e field', false, true);
    this.assertTrue(Array.isArray(fields) && fields.length > 0, `inspect: expected non-empty field array, got: ${String(fields)}`);
    if (Array.isArray(fields) && fields.length > 0) {
      const fld = fields[0];
      // $FlowFixMe[incompatible-use]
      const fldName: mixed = fld.name;
      // $FlowFixMe[incompatible-use]
      const fldFormCmd: mixed = fld.form_cmd;
      this.assertTrue(typeof fldName === 'string' && fldName.length > 0, `inspect: fld.name is not a non-empty string: ${String(fldName)}`);
      this.assertTrue(typeof fldFormCmd === 'string' && fldFormCmd.startsWith('form'), `inspect: fld.form_cmd is not a form string: ${String(fldFormCmd)}`);
    }

    // --- record: getFormRecord() has legacy+OWL support — must be non-empty on open form ---
    const record: mixed = await this.terminal.execute('inspect -e record', false, true);
    this.assertTrue(Array.isArray(record) && record.length > 0, `inspect: expected non-empty record array, got: ${String(record)}`);
    if (Array.isArray(record) && record.length > 0) {
      const rf = record[0];
      // $FlowFixMe[incompatible-use]
      const rfName: mixed = rf.name;
      // $FlowFixMe[incompatible-use]
      const rfValue: mixed = rf.value;
      this.assertTrue(typeof rfName === 'string' && rfName.length > 0, `inspect: rf.name is not a non-empty string: ${String(rfName)}`);
      this.assertTrue(typeof rfValue === 'string', `inspect: rf.value is not a string: ${String(rfValue)}`);
    }

    // --- tab/statusbar/breadcrumb: may be empty but must be arrays ---
    // (res.company may have no notebook tabs or statusbar depending on version/modules)
    const tabsRes: mixed = await this.terminal.execute('inspect -e tab', false, true);
    this.assertTrue(Array.isArray(tabsRes), `inspect: tab result is not an array: ${String(tabsRes)}`);
    const statusbarRes: mixed = await this.terminal.execute('inspect -e statusbar', false, true);
    this.assertTrue(Array.isArray(statusbarRes), `inspect: statusbar result is not an array: ${String(statusbarRes)}`);
    const breadcrumbRes: mixed = await this.terminal.execute('inspect -e breadcrumb', false, true);
    this.assertTrue(Array.isArray(breadcrumbRes), `inspect: breadcrumb result is not an array: ${String(breadcrumbRes)}`);

    // --- view switcher: .o_switch_view only exists in Odoo 13+; skip on older versions ---
    const odooMajor = getOdooVersion('major');
    // $FlowFixMe[invalid-compare]
    if (typeof odooMajor === 'number' && odooMajor >= 13) {
      await this.terminal.execute('action -a base.action_partner_form', false, true);
      await asyncSleep(2500);
      const views: mixed = await this.terminal.execute('inspect -e view', false, true);
      this.assertTrue(Array.isArray(views), `inspect: view result is not an array: ${String(views)}`);
    }
  }
}
