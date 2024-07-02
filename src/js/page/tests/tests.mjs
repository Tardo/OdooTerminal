// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import isEmpty from '@trash/utils/is_empty';
import type OdooTerminal from '@odoo/terminal';

class TerminalTestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TERMINAL_TEST_VALIDATION_ERROR';
    this.message = message;
  }
}

export default class TerminalTestSuite {
  #terminal: OdooTerminal;

  constructor(terminal: OdooTerminal) {
    this.#terminal = terminal;
  }

  // $FlowIgnore
  get terminal() {
    return this.#terminal;
  }

  #toString(val: mixed): string {
    return new String(val).toString();
  }

  assertTrue(val: mixed, msg: string = ''): void {
    if (val !== true) {
      throw new TerminalTestValidationError(msg || `'${this.#toString(val)}' must be true`);
    }
  }
  assertFalse(val: mixed, msg: string = ''): void {
    if (val !== false) {
      throw new TerminalTestValidationError(msg || `'${this.#toString(val)}' must be false`);
    }
  }
  assertEqual(valA: mixed, valB: mixed, msg: string = ''): void {
    if (valA !== valB) {
      throw new TerminalTestValidationError(msg || `'${this.#toString(valA)}' must be equal to '${this.#toString(valB)}'`);
    }
  }
  assertNotEqual(valA: mixed, valB: mixed, msg: string = ''): void {
    if (valA === valB) {
      throw new TerminalTestValidationError(msg || `'${this.#toString(valA)}' must not be equal to '${this.#toString(valB)}'`);
    }
  }
  // $FlowFixMe
  assertIn(obj: Object, key: string, msg: string = ''): void {
    if (!Object.hasOwn(obj, key)) {
      throw new TerminalTestValidationError(msg || `'${key}' must be in '${obj}'`);
    }
  }
  // $FlowFixMe
  assertNotIn(obj: Object, key: string, msg: string = ''): void {
    if (Object.hasOwn(obj, key)) {
      throw new TerminalTestValidationError(msg || `'${key}' must not be in '${obj}'`);
    }
  }
  assertEmpty(val: mixed, msg: string = ''): void {
    if (!isEmpty(val)) {
      throw new TerminalTestValidationError(msg || `'${this.#toString(val)}' must be empty`);
    }
  }
  assertNotEmpty(val: mixed, msg: string = ''): void {
    if (isEmpty(val)) {
      throw new TerminalTestValidationError(msg || `'${this.#toString(val)}' must not be empty`);
    }
  }

  getModalOpen(): HTMLElement | null {
    return document.querySelector('.modal.show,.modal.in,.modal.o_technical_modal');
  }
  // $FlowFixMe
  isModalType($modal: Object, type: string): boolean {
    return $modal.find(`.o_${type}_view`).length > 0;
  }
  // $FlowFixMe
  closeModal($modal: Object) {
    $modal.find('.close,.btn-close')[0].click();
  }

  isFormOpen(): boolean {
    return (
      document.querySelector(
        '.o_view_controller .o_form_view,.o_view_manager_content .o_form_view,.o_view_controller .o_form_view_container',
      ) !== null
    );
  }

  async onStartTests(test_names: $ReadOnlyArray<string>): Promise<$ReadOnlyArray<string>> {
    return test_names;
  }
  async onBeforeTest(test_name: string): Promise<string> {
    this.terminal.doShow();
    return test_name;
  }
  async onAfterTest(test_name: string): Promise<string> {
    return test_name;
  }
  async onEndTests(test_names: $ReadOnlyArray<string>): Promise<$ReadOnlyArray<string>> {
    return test_names;
  }
}
