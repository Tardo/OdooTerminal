// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.tests.TraSH", function (require) {
    "use strict";

    const TerminalTestSuite = require("terminal.tests");

    TerminalTestSuite.include({
        test_trash: async function () {
            // Array
            let results = await this.terminal._virtMachine.eval("[1,2, 3,4]");
            this.assertEqual(results[0][2], 3);
            results = await this.terminal._virtMachine.eval(
                "['test', 'this','lalala lo,lolo']"
            );
            this.assertEqual(results[0][2], "lalala lo,lolo");
            results = await this.terminal._virtMachine.eval(
                "[[1,2, 3,4], ['test', 'this','lalala lo,lolo', [12,3,[123,'oops', {key: 'the value'}]]]]"
            );
            this.assertEqual(results[0][1][3][2][2].key, "the value");

            // Dictionary
            results = await this.terminal._virtMachine.eval(
                "{keyA: 'the value', keyB: 'the, value'}"
            );
            this.assertEqual(results[0].keyB, "the, value");
            results = await this.terminal._virtMachine.eval(
                "{keyA: 1234, keyB: 55}"
            );
            this.assertEqual(results[0].keyB, 55);
            results = await this.terminal._virtMachine.eval(
                "{keyA: 1234, keyB: 'the value', keyC: 'the, value', keyD: {keyA: 23, keyB: [2,33,4], keyC: {keyA: 'the, value'}}}"
            );
            this.assertEqual(results[0].keyD.keyC.keyA, "the, value");

            // Global variables
            await this.terminal._virtMachine.eval("$test = 'this is a test'");
            results = await this.terminal._virtMachine.eval("$test");
            this.assertEqual(results[0], "this is a test");
            await this.terminal._virtMachine.eval("$test = 1234");
            results = await this.terminal._virtMachine.eval("$test");
            this.assertEqual(results[0], 1234);
            await this.terminal._virtMachine.eval("$test = [1,2,3,4]");
            results = await this.terminal._virtMachine.eval("$test");
            this.assertEqual(results[0][2], 3);
            await this.terminal._virtMachine.eval("$test[2] = 42");
            results = await this.terminal._virtMachine.eval("$test");
            this.assertEqual(results[0][2], 42);
            await this.terminal._virtMachine.eval(
                "$test = {test: 12, this: 'is trash'}"
            );
            results = await this.terminal._virtMachine.eval("$test");
            this.assertEqual(results[0].test, 12);
            await this.terminal._virtMachine.eval(
                "$test['this'] = 'blablabla; and, bla'"
            );
            results = await this.terminal._virtMachine.eval("$test");
            this.assertEqual(results[0].this, "blablabla; and, bla");

            // Concat
            results = await this.terminal._virtMachine.eval(
                "$a = 'blabla'; $b = 1234; $a + '---' + $b;"
            );
            this.assertEqual(results[0], "blabla---1234");
            results = await this.terminal._virtMachine.eval(
                "$a = [{test: 124, this: 'lelele lololo'}]; $b = [54,42]; $a[0]['this'] + '---' + $b[1];"
            );
            this.assertEqual(results[0], "lelele lololo---42");
        },
    });
});
