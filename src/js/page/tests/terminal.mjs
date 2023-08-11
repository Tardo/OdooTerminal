// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import TestBackend from "./test_backend.mjs";
import TestCommon from "./test_common.mjs";
import TestCore from "./test_core.mjs";
import TestTrash from "./test_trash.mjs";
import OdooTerminal from "../odoo/terminal.mjs";
import {isEmpty} from "../terminal/core/utils.mjs";

const TestSuites = [TestBackend, TestCommon, TestCore, TestTrash];

export default class OdooTerminalTests extends OdooTerminal {
  /**
   * @override
   */
  createTerminal() {
    super.createTerminal();
    this.$el[0].addEventListener(
      "start_terminal_tests",
      this.onStartTests.bind(this)
    );
  }

  onStartTests(ev) {
    const test_names = (ev.detail || "").split(",").filter((item) => item);
    this.doShow().then(() => {
      this.screen.clean();
      this.#runTests(test_names);
    });
  }

  #getTestMethods(obj) {
    const names = new Set();
    do {
      Object.getOwnPropertyNames(obj)
        .filter(
          (item) => item.startsWith("test_") && typeof obj[item] === "function"
        )
        .map((item) => names.add(item));
    } while ((obj = Object.getPrototypeOf(obj)));
    return [...names];
  }

  #runTests(test_names) {
    return new Promise(async (resolve, reject) => {
      const errors = {};
      for (const TestClass of TestSuites) {
        const test_suit = new TestClass(this);
        let names = this.#getTestMethods(test_suit);
        if (!isEmpty(test_names)) {
          names = names.filter((item) => test_names.includes(item));
        }
        if (!isEmpty(names)) {
          this.screen.print("[info] Running tests...");
          await test_suit.onStartTests(names);
          for (const name of names) {
            this.screen.print(`${name}... `, true);
            await test_suit.onBeforeTest.call(test_suit, name);
            try {
              await test_suit[name].call(test_suit);
              this.screen.print("OK");
              // Ensure that the terminal remains open
              this.doShow();
            } catch (e) {
              errors[name] = e;
              this.screen.printError(e.stack);
              this.screen.print("FAIL");
            }
            await test_suit.onAfterTest.call(test_suit, name);
          }
          await test_suit.onEndTests(names);
        }
      }
      this.screen.print("");
      if (Object.keys(errors).length > 0) {
        this.screen.print(
          "ERRORS. The following test failed:",
          false,
          "terminal-test-fail"
        );
        this.screen.print(Object.keys(errors));
        return reject(errors);
      }
      this.screen.print("OK. All tests passed.", false, "terminal-test-ok");
      return resolve();
    });
  }
}
