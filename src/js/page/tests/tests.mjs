// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {isEmpty} from "@terminal/core/utils";

class TerminalTestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "TERMINAL_TEST_VALIDATION_ERROR";
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

  assertTrue(val, msg = "") {
    if (!val) {
      throw new TerminalTestValidationError(msg);
    }
  }
  assertFalse(val, msg = "") {
    if (val) {
      throw new TerminalTestValidationError(msg);
    }
  }
  assertEqual(valA, valB, msg = "") {
    if (valA !== valB) {
      throw new TerminalTestValidationError(msg);
    }
  }
  assertNotEqual(valA, valB, msg = "") {
    if (valA === valB) {
      throw new TerminalTestValidationError(msg);
    }
  }
  assertIn(obj, key, msg = "") {
    if (!Object.hasOwn(obj, key)) {
      throw new TerminalTestValidationError(msg);
    }
  }
  assertNotIn(obj, key, msg = "") {
    if (Object.hasOwn(obj, key)) {
      throw new TerminalTestValidationError(msg);
    }
  }
  assertEmpty(val, msg = "") {
    if (!isEmpty(val)) {
      throw new TerminalTestValidationError(msg);
    }
  }
  assertNotEmpty(val, msg = "") {
    if (isEmpty(val)) {
      throw new TerminalTestValidationError(msg);
    }
  }

  getModalOpen() {
    return $(".modal.show,.modal.in,.modal.o_technical_modal");
  }
  isModalType($modal, type) {
    return $modal.find(`.o_${type}_view`).length > 0;
  }
  closeModal($modal) {
    $modal.find(".close,.btn-close")[0].click();
  }

  isFormOpen() {
    return (
      document.querySelector(
        ".o_view_controller .o_form_view,.o_view_manager_content .o_form_view,.o_view_controller .o_form_view_container"
      ) !== null
    );
  }

  onStartTests(test_names) {
    return Promise.resolve(test_names);
  }
  onBeforeTest(test_name) {
    this.terminal.doShow();
    return Promise.resolve(test_name);
  }
  onAfterTest(test_name) {
    return Promise.resolve(test_name);
  }
  onEndTests(test_names) {
    return Promise.resolve(test_names);
  }
}
