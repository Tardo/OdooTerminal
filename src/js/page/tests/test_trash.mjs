// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import TerminalTestSuite from "./tests";

export default class TestTrash extends TerminalTestSuite {
  async test_trash() {
    // Array
    let results = await this.terminal.eval("[1,    2    , 3,     4     ]");
    this.assertEqual(results[0][2], 3);
    results = await this.terminal.eval("[  'test', 'this','lalala lo,lolo']");
    this.assertEqual(results[0][2], "lalala lo,lolo");
    results = await this.terminal.eval("[  23,        -2,3,-345]");
    this.assertEqual(results[0][3], -345);
    results = await this.terminal.eval(
      "[[ 1, 2, 3 ,4], ['test', 'this','lalala lo,  lolo', [12,   3,    [123   ,'oops'   , {   key: 'the value'}]]]]"
    );
    this.assertEqual(results[0][1][3][2][2].key, "the value");

    // Dictionary
    results = await this.terminal.eval(
      "{keyA: 'the value', keyB: 'the, value'}"
    );
    this.assertEqual(results[0].keyB, "the, value");
    results = await this.terminal.eval("{keyA: -23, keyB: 'the, value'}");
    this.assertEqual(results[0].keyA, -23);
    results = await this.terminal.eval("{keyA: 1234, keyB: 55}");
    this.assertEqual(results[0].keyB, 55);
    results = await this.terminal.eval(
      "{keyA: 1234, keyB: 'the value', keyC: 'the, value', keyD: {keyA: 23, keyB: [2,33,4], keyC: {keyA   :   'the, value'}}}"
    );
    this.assertEqual(results[0].keyD.keyC.keyA, "the, value");

    // Global variables
    await this.terminal.eval("$test = 'this is a test'");
    results = await this.terminal.eval("$test");
    this.assertEqual(results[0], "this is a test");
    await this.terminal.eval("$test = 1234");
    results = await this.terminal.eval("$test");
    this.assertEqual(results[0], 1234);
    await this.terminal.eval("$test = [1,2,3,4]");
    results = await this.terminal.eval("$test");
    this.assertEqual(results[0][2], 3);
    await this.terminal.eval("$test[2] = 42");
    results = await this.terminal.eval("$test");
    this.assertEqual(results[0][2], 42);
    await this.terminal.eval("$test = {test: 12, this: 'is trash'}");
    results = await this.terminal.eval("$test");
    this.assertEqual(results[0].test, 12);
    await this.terminal.eval(`$test['this'] = "blabla'bla; 'a'nd, bla"`);
    results = await this.terminal.eval("$test");
    this.assertEqual(results[0].this, "blabla'bla; 'a'nd, bla");

    // Runners
    await this.terminal.eval("$test = $(search res.partner)");
    results = await this.terminal.eval("$test['ids']");
    this.assertEqual(results[0].constructor, Array);
    this.assertTrue(results[0].length > 0);
    results = await this.terminal.eval("$(search res.partner -f name)['ids']");
    this.assertEqual(results[0].constructor, Array);
    this.assertTrue(results[0].length > 0);
    results = await this.terminal.eval(
      "$(search res.partner -f name)[0]['name']"
    );
    this.assertEqual(results[0].constructor, String);
    this.assertTrue(results[0].length > 0);
    results = await this.terminal.eval("{test: $(gen -mi 1 -ma 4)}");
    this.assertTrue(results[0].test.length);
    results = await this.terminal.eval(
      "{fulano: $(gen -mi 2 -ma 4), mengano: $(gen -mi 4 -ma 7), zutano: { perengano: $(gen -t int -mi 7 -ma 10) }}"
    );
    this.assertTrue(results[0].fulano.length);
    this.assertTrue(results[0].mengano.length);
    this.assertTrue(results[0].zutano.perengano > 6);

    // Concat
    results = await this.terminal.eval(
      "$a = 'blabla'; $b = 1234;$a+'---' + $b;"
    );
    this.assertEqual(results[0], "blabla---1234");
    results = await this.terminal.eval(
      "$a = 'blabla'\n $b = 1234\n$a+'---' + $b;"
    );
    this.assertEqual(results[0], "blabla---1234");
    results = await this.terminal.eval(
      "$a = [{test: 124, this: 'lelele lololo'}]; $b = [54,42]; $a[0]['this'] + '---' + $b[1];"
    );
    this.assertEqual(results[0], "lelele lololo---42");

    // Math
    results = await this.terminal.eval("$(((5+5)*2))");
    this.assertEqual(results[0], 20);
    results = await this.terminal.eval("$val = $((5*2)); $((5+$val))");
    this.assertEqual(results[0], 15);
    results = await this.terminal.eval(
      "$val = $((5*2)); $((5+$val-55*(45-33)))"
    );
    this.assertEqual(results[0], -645);
    results = await this.terminal.eval(
      "$data = {numA: 4, numB:9}; $(( ($data['numA']    * $data['numB']  +    4  )  * -2     ))"
    );
    this.assertEqual(results[0], -80);
  }
}
