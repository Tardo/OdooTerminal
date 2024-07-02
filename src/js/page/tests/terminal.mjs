// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import OdooTerminal from '@odoo/terminal';
import isEmpty from '@trash/utils/is_empty';
import TestBackend from './test_backend';
import TestCommon from './test_common';
import TestCore from './test_core';
import TestTrash from './test_trash';

const TestSuites = [TestTrash, TestCore, TestCommon, TestBackend];

export default class OdooTerminalTests extends OdooTerminal {
  /**
   * @override
   */
  createTerminal() {
    super.createTerminal();
    // $FlowFixMe
    this.el.addEventListener('start_terminal_tests', this.onStartTests.bind(this));
  }

  onStartTests(ev: CustomEvent) {
    const test_names = (ev.detail || '').split(',').filter(item => item);
    this.doShow().then(() => {
      this.screen.clean();
      return this.#runTests(test_names);
    });
  }

  // $FlowFixMe
  #getTestMethods(obj: Object) {
    const names = new Set<string>();
    let it_obj = obj;
    do {
      Object.getOwnPropertyNames(it_obj)
        .filter(item => item.startsWith('test_') && typeof obj[item] === 'function')
        .map(item => names.add(item));
    } while ((it_obj = Object.getPrototypeOf(it_obj)));
    return [...names];
  }

  async #runTests(test_names: $ReadOnlyArray<String>): Promise<{[string]: mixed} | void> {
    const errors = {};
    for (const TestClass of TestSuites) {
      const test_suit = new TestClass(this);
      let names = this.#getTestMethods(test_suit);
      if (!isEmpty(test_names)) {
        names = names.filter(item => test_names.includes(item));
      }
      if (!isEmpty(names)) {
        this.screen.print(`[info] Running '${TestClass.name}' tests...`);
        await test_suit.onStartTests(names);
        for (const name of names) {
          this.screen.print(`${name}... `, true);
          await test_suit.onBeforeTest(name);
          try {
            await test_suit[name]();
            this.screen.print('OK');
            // Ensure that the terminal remains open
            this.doShow();
          } catch (e) {
            errors[name] = e;
            this.screen.print('FAIL');
            this.screen.printError(e.stack);
            console.error(e);
          }
          await test_suit.onAfterTest(name);
        }
        await test_suit.onEndTests(names);
      }
    }
    this.screen.print('');
    if (Object.keys(errors).length > 0) {
      // Soft-Error
      this.screen.print('ERRORS. The following test failed:', false, 'terminal-test-fail');
      this.screen.print(Object.keys(errors));
      return errors;
    }
    this.screen.print('OK. All tests passed.', false, 'terminal-test-ok');
  }
}
