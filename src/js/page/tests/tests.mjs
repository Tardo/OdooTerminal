// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import isEmpty from '@terminal/utils/is_empty';

class TerminalTestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TERMINAL_TEST_VALIDATION_ERROR';
    this.message = message;
  }
}

export default class TerminalTestSuite {
  #terminal = null;

  constructor(terminal) {
    this.#terminal = terminal;
  }

  get terminal() {
    return this.#terminal;
  }

  assertTrue(val, msg = '') {
    if (!val) {
      throw new TerminalTestValidationError(msg || `'${val}' must be true`);
    }
  }
  assertFalse(val, msg = '') {
    if (val) {
      throw new TerminalTestValidationError(msg || `'${val}' must be false`);
    }
  }
  assertEqual(valA, valB, msg = '') {
    if (valA !== valB) {
      throw new TerminalTestValidationError(
        msg || `'${valA}' must be equal to '${valB}'`,
      );
    }
  }
  assertNotEqual(valA, valB, msg = '') {
    if (valA === valB) {
      throw new TerminalTestValidationError(
        msg || `'${valA}' must not be equal to '${valB}'`,
      );
    }
  }
  assertIn(obj, key, msg = '') {
    if (!Object.hasOwn(obj, key)) {
      throw new TerminalTestValidationError(
        msg || `'${key}' must be in '${obj}'`,
      );
    }
  }
  assertNotIn(obj, key, msg = '') {
    if (Object.hasOwn(obj, key)) {
      throw new TerminalTestValidationError(
        msg || `'${key}' must not be in '${obj}'`,
      );
    }
  }
  assertEmpty(val, msg = '') {
    if (!isEmpty(val)) {
      throw new TerminalTestValidationError(msg || `'${val}' must be empty`);
    }
  }
  assertNotEmpty(val, msg = '') {
    if (isEmpty(val)) {
      throw new TerminalTestValidationError(
        msg || `'${val}' must not be empty`,
      );
    }
  }

  getModalOpen() {
    return $('.modal.show,.modal.in,.modal.o_technical_modal');
  }
  isModalType($modal, type) {
    return $modal.find(`.o_${type}_view`).length > 0;
  }
  closeModal($modal) {
    $modal.find('.close,.btn-close')[0].click();
  }

  isFormOpen() {
    return (
      document.querySelector(
        '.o_view_controller .o_form_view,.o_view_manager_content .o_form_view,.o_view_controller .o_form_view_container',
      ) !== null
    );
  }

  async onStartTests(test_names) {
    return test_names;
  }
  async onBeforeTest(test_name) {
    this.terminal.doShow();
    return test_name;
  }
  async onAfterTest(test_name) {
    return test_name;
  }
  async onEndTests(test_names) {
    return test_names;
  }
}
