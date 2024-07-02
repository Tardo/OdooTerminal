// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import asyncSleep from '@terminal/utils/async_sleep';
import TerminalTestSuite from './tests';

export default class TestBackend extends TerminalTestSuite {
  async test_settings() {
    await this.terminal.execute('settings', false, true);
    await asyncSleep(2000);
    this.assertNotEqual(document.querySelector('.o_form_view .settings, .o_form_view > .settings'), null);
  }

  async test_view() {
    await this.terminal.execute('view -m res.company', false, true);
    await asyncSleep(2500);
    const $modal = this.getModalOpen();
    this.assertTrue(this.isModalType($modal, 'list'));
    this.closeModal($modal);
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
}
