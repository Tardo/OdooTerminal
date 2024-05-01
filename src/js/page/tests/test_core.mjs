// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import TerminalTestSuite from './tests';

export default class TestCore extends TerminalTestSuite {
  _orig_context: {[string]: mixed} = {};
  // Can't test 'exportfile' because required user interaction

  /**
   * @override
   */
  async onBeforeTest(test_name: string): Promise<string> {
    const res = await super.onBeforeTest(arguments);
    if (test_name === 'test_context_term') {
      const context = (await this.terminal.execute('context_term', false, true))[0];
      this._orig_context = context;
    }
    return res;
  }

  /**
   * @override
   */
  async onAfterTest(test_name: string): Promise<string> {
    const res = super.onAfterTest(arguments);
    if (test_name === 'test_context_term') {
      return this.terminal.execute(`context_term -o set -v '${JSON.stringify(this._orig_context)}'`, false, true);
    }
    return res;
  }

  async test_call_not_named_args() {
    let res = (
      await this.terminal.execute('alias test "print -m \'This is a test! $1 ($2[Nothing])\'"', false, true)
    )[0];
    this.assertIn(res, 'test');
    res = (
      await this.terminal.execute('alias testB -c "print -m \'This is a test! $1 ($2[Nothing])\'"', false, true)
    )[0];
    this.assertIn(res, 'testB');
  }

  async test_help() {
    await this.terminal.execute('help', false, true);
    await this.terminal.execute('help -c search', false, true);
    await this.terminal.execute('help search', false, true);
  }

  async test_print() {
    const res = (await this.terminal.execute("print -m 'This is a test!'", false, true))[0];
    this.assertEqual(res, 'This is a test!');
  }

  async test_load() {
    const res = (
      await this.terminal.execute(
        "load -u 'https://cdnjs.cloudflare.com/ajax/libs/Mock.js/1.0.0/mock-min.js'",
        false,
        true,
      )
    )[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
  }

  async test_context_term() {
    let res = (await this.terminal.execute('context_term', false, true))[0];
    this.assertIn(res, 'active_test');
    res = (await this.terminal.execute('context_term -o read', false, true))[0];
    this.assertIn(res, 'active_test');
    res = (await this.terminal.execute("context_term -o write -v {test_key: 'test_value'}", false, true))[0];
    this.assertIn(res, 'test_key');
    res = (await this.terminal.execute("context_term -o set -v {test_key: 'test_value_change'}", false, true))[0];
    this.assertEqual(res.test_key, 'test_value_change');
    res = (await this.terminal.execute('context_term -o delete -v test_key', false, true))[0];
    this.assertNotIn(res, 'test_key');
  }

  async test_alias() {
    let res = (await this.terminal.execute('alias', false, true))[0];
    // This.assertEmpty(res);
    res = (
      await this.terminal.execute('alias -n test -c "print -m \'This is a test! $1 ($2[Nothing])\'"', false, true)
    )[0];
    this.assertIn(res, 'test');
    res = (await this.terminal.execute('test Foo "Bar Space"', false, true))[0];
    this.assertEqual(res, 'This is a test! Foo (Bar Space)');
    res = (await this.terminal.execute('test Foo', false, true))[0];
    this.assertEqual(res, 'This is a test! Foo (Nothing)');
    res = (await this.terminal.execute('alias -n test', false, true))[0];
    this.assertNotIn(res, 'test');
  }

  async test_quit() {
    await this.terminal.execute('quit', false, true);
    this.assertFalse(this.terminal.$el.hasClass('terminal-transition-topdown'));
  }

  async test_exportvar() {
    const res = (await this.terminal.execute("exportvar -v $(print 'This is a test')", false, true))[0];
    this.assertTrue(Object.hasOwn(window, res));
    this.assertEqual(window[res], 'This is a test');
  }

  async test_chrono() {
    const res = (await this.terminal.execute('chrono -c "print -m \'This is a test\'"', false, true))[0];
    this.assertNotEqual(res, -1);
  }

  async test_repeat() {
    const res = (await this.terminal.execute('repeat -t 50 -c "print -m \'This is a test\'" --silent', false, true))[0];
    this.assertNotEqual(res, -1);
  }

  async test_jobs() {
    const res = (await this.terminal.execute('jobs', false, true))[0];
    this.assertEqual(res[0]?.cmdInfo.cmdName, 'jobs');
  }

  async test_gen() {
    let res = (await this.terminal.execute('gen -t str -mi 4 -ma 4', false, true))[0];
    this.assertEqual(res.length, 4);
    res = (await this.terminal.execute('gen -t int -mi 5 -ma 10', false, true))[0];
    this.assertTrue(res >= 5 && res <= 10);
    res = (await this.terminal.execute('gen -t float -mi 5 -ma 10', false, true))[0];
    this.assertTrue(res >= 5.0 && res < 11.0);
    res = (await this.terminal.execute('gen -t intseq -mi 5 -ma 10', false, true))[0];
    this.assertEqual(res[0], 5);
    this.assertEqual(res[5], 10);
    res = (await this.terminal.execute('gen -t date -mi 500000000 -ma 500000000', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('gen -t tzdate -mi 500000000 -ma 500000000', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('gen -t time -mi 500000000 -ma 500000000', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('gen -t tztime -mi 500000000 -ma 500000000', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('gen -t datetime -mi 500000000 -ma 500000000', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('gen -t tzdatetime -mi 500000000 -ma 500000000', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('gen -t email -mi 8 -ma 15', false, true))[0];
    this.assertTrue(res.indexOf('@') > 0);
    res = (await this.terminal.execute('gen -t url -mi 8 -ma 15', false, true))[0];
    this.assertTrue(res.startsWith('https://www.'));
  }

  async test_now() {
    let res = (await this.terminal.execute('now', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('now -t date', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('now -t time', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('now -t date --tz', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('now -t time --tz', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
    res = (await this.terminal.execute('now -t full --tz', false, true))[0];
    this.assertTrue(res !== null && typeof res !== 'undefined');
  }

  async test_commit() {
    await this.terminal.execute("$rs = $(read res.partner 8); $rs['name'] = 'Willy Wonka';", false, true);
    let res = (await this.terminal.execute('print $rs', false, true))[0];
    this.assertNotEmpty(res.toWrite());
    res = (await this.terminal.execute('commit $rs', false, true))[0];
    this.assertTrue(res);
    res = (await this.terminal.execute('print $rs', false, true))[0];
    this.assertEmpty(res.toWrite());
    res = (await this.terminal.execute('read res.partner 8 -f name', false, true))[0];
    this.assertEqual(res.name, 'Willy Wonka');
  }

  async test_rollback() {
    await this.terminal.execute("$rsb = $(read res.partner 8); $rsb['name'] = 'Willy Wonka';", false, true);
    const res = (await this.terminal.execute('print $rsb', false, true))[0];
    this.assertNotEmpty(res.toWrite());
    await this.terminal.execute('rollback $rsb', false, true);
    this.assertEmpty(res.toWrite());
  }
}
