// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import TerminalTestSuite from './tests';

export default class TestTrash extends TerminalTestSuite {
  async test_trash_array() {
    let results = await this.terminal.getShell().eval('[1,    2    , 3,     4     ]');
    this.assertEqual(results[0], 1);
    this.assertEqual(results[1], 2);
    this.assertEqual(results[2], 3);
    this.assertEqual(results[3], 4);
    results = await this.terminal.getShell().eval("[  'test', 'this','lalala lo,lolo']");
    this.assertEqual(results[0], 'test');
    this.assertEqual(results[1], 'this');
    this.assertEqual(results[2], 'lalala lo,lolo');
    results = await this.terminal.getShell().eval('[  23,        -2,3,-345]');
    this.assertEqual(results[0], 23);
    this.assertEqual(results[1], -2);
    this.assertEqual(results[2], 3);
    this.assertEqual(results[3], -345);
    results = await this.terminal.getShell().eval(
      "[[ 1, 2, 3 ,4], ['test', 'this','lalala lo,  lolo', [12,   3,    [123   ,'oops'   , 123 * 2 + 4 - 2 + 6 / 2, {   key: 'the value'}]]]]",
    );
    this.assertEqual(results[0][0], 1);
    this.assertEqual(results[0][1], 2);
    this.assertEqual(results[0][2], 3);
    this.assertEqual(results[0][3], 4);
    this.assertEqual(results[1][0], 'test');
    this.assertEqual(results[1][1], 'this');
    this.assertEqual(results[1][2], 'lalala lo,  lolo');
    this.assertEqual(results[1][3][0], 12);
    this.assertEqual(results[1][3][1], 3);
    this.assertEqual(results[1][3][2][0], 123);
    this.assertEqual(results[1][3][2][1], 'oops');
    this.assertEqual(results[1][3][2][2], 251);
    this.assertEqual(results[1][3][2][3].key, 'the value');
  }

  async test_trash_dictionary() {
    let results = await this.terminal.getShell().eval("{keyA: 'the value', keyB: 'the, value'}");
    this.assertEqual(results.keyA, 'the value');
    this.assertEqual(results.keyB, 'the, value');
    results = await this.terminal.getShell().eval("{keyA: -23, keyB: 'the, value'}");
    this.assertEqual(results.keyA, -23);
    this.assertEqual(results.keyB, 'the, value');
    results = await this.terminal.getShell().eval('{keyA: 1234, keyB: 55}');
    this.assertEqual(results.keyA, 1234);
    this.assertEqual(results.keyB, 55);
    results = await this.terminal.getShell().eval(
      "{keyA: 1234, keyB: 'the value', keyC: 'the, value', keyD: {keyA: 23, keyB: [2,33,4], keyC: {keyA   :   'the, value'}}}",
    );
    this.assertEqual(results.keyA, 1234);
    this.assertEqual(results.keyB, 'the value');
    this.assertEqual(results.keyC, 'the, value');
    this.assertEqual(results.keyD.keyA, 23);
    this.assertEqual(results.keyD.keyB[0], 2);
    this.assertEqual(results.keyD.keyB[1], 33);
    this.assertEqual(results.keyD.keyB[2], 4);
    this.assertEqual(results.keyD.keyC.keyA, 'the, value');
  }

  async test_trash_assigments() {
    let results = await this.terminal.getShell().eval("$var_at = 2; $var_at += 5; $var_at -= 1; $var_at *= 2; $var_at /= 2; $var_at");
    this.assertEqual(results, 6);
    results = await this.terminal.getShell().eval("$arr_at = [1, [34, [2, 10], 4]]; $arr_at[1][1][0] += 5; $arr_at[1][1][0] -= 1; $arr_at[1][1][0] *= 2; $arr_at[1][1][0] /= 2; $arr_at;");
    this.assertEqual(results[1][1][0], 6);
    results = await this.terminal.getShell().eval("$var_at_t = 5; $var_at = 2; $var_at += $var_at_t; $var_at");
    this.assertEqual(results, 7);
    results = await this.terminal.getShell().eval("$arr_at_t = [1, [34, [2, 10], 4]]; $var_at = 2; $var_at += $arr_at_t[1][1][1]; $var_at");
    this.assertEqual(results, 12);
  }

  async test_trash_variables() {
    await this.terminal.getShell().eval("$test = 'this is a test'");
    let results = await this.terminal.getShell().eval('$test');
    this.assertEqual(results, 'this is a test');
    await this.terminal.getShell().eval('$test = 1234');
    results = await this.terminal.getShell().eval('$test');
    this.assertEqual(results, 1234);
    await this.terminal.getShell().eval('$test = [1,2,3,4]');
    results = await this.terminal.getShell().eval('$test');
    this.assertEqual(results[2], 3);
    await this.terminal.getShell().eval('$test[2] = 42');
    results = await this.terminal.getShell().eval('$test');
    this.assertEqual(results[2], 42);
    await this.terminal.getShell().eval("$test = {test: 12, this: 'is trash'}");
    results = await this.terminal.getShell().eval('$test');
    this.assertEqual(results.test, 12);
    await this.terminal.getShell().eval(`$test['this'] = "blabla'bla; 'a'nd, bla"`);
    results = await this.terminal.getShell().eval('$test');
    this.assertEqual(results.this, "blabla'bla; 'a'nd, bla");
  }

  async test_trash_runners() {
    await this.terminal.getShell().eval('$test = (search res.partner)');
    let results = await this.terminal.getShell().eval("$test['ids']");
    this.assertEqual(results.constructor, Array);
    this.assertTrue(results.length > 0);
    results = await this.terminal.getShell().eval("(search res.partner -f name)['ids']");
    this.assertEqual(results.constructor, Array);
    this.assertTrue(results.length > 0);
    results = await this.terminal.getShell().eval("(search res.partner -f name)[0]['name']");
    this.assertEqual(results.constructor, String);
    this.assertTrue(results.length > 0);
    results = await this.terminal.getShell().eval('{test: (gen -mi 1 -ma 4)}');
    this.assertTrue(results.test.length > 0);
    results = await this.terminal.getShell().eval(
      '{fulano: (gen -mi 2 -ma 4), mengano: (gen -mi 4 -ma 7), zutano: { perengano: (gen -t int -mi 7 -ma 10) }}',
    );
    this.assertTrue(results.fulano.length > 0);
    this.assertTrue(results.mengano.length > 0);
    this.assertTrue(results.zutano.perengano > 6);
  }

  async test_trash_concat() {
    let results = await this.terminal.getShell().eval("$a = 'blabla'; $b = 1234;$a+'---' + $b;");
    this.assertEqual(results, 'blabla---1234');
    results = await this.terminal.getShell().eval("$a = 'blabla'\n $b = 1234\n$a+'---' + $b;");
    this.assertEqual(results, 'blabla---1234');
    results = await this.terminal.getShell().eval(
      "$a = [{test: 124, this: 'lelele lololo'}]; $b = [54,42]; $a[0]['this'] + '---' + $b[1];",
    );
    this.assertEqual(results, 'lelele lololo---42');
  }

  async test_trash_arithmetic() {
    let results = await this.terminal.getShell().eval('(((5+5)*2))');
    this.assertEqual(results, 20);
    results = await this.terminal.getShell().eval('$val = 5*2; 5+$val');
    this.assertEqual(results, 15);
    results = await this.terminal.getShell().eval('$val = 5*2; 5+$val-55*(45-33)');
    this.assertEqual(results, -645);
    results = await this.terminal.getShell().eval(
      "$data = {numA: 4, numB:9, numC: [23,2]}; ($data['numA']    * $data['numB'] + $data['numC'][1] +    4  )  * -2   ",
    );
    this.assertEqual(results, -84);
  }

  async test_trash_logic() {
    let results = await this.terminal.getShell().eval("$data = {numA: 4, numB:9}; $data['numB'] > 3");
    this.assertTrue(results);
    results = await this.terminal.getShell().eval("$data = {numA: 4, numB:9}; $data['numB'] > 13");
    this.assertFalse(results);
    results = await this.terminal.getShell().eval("$data = {numA: 4, numB:9}; $data['numB'] > 0 && $data['numB'] < 9");
    this.assertFalse(results);
    results = await this.terminal.getShell().eval("$data = {numA: 4, numB:9}; $data['numB'] >= 0 && $data['numB'] <= 9");
    this.assertTrue(results);
    results = await this.terminal.getShell().eval("$data = {numA: 4, numB:9}; ($data['numB'] > 0 && $data['numB'] < 9) || $data['numA'] >= 4");
    this.assertTrue(results);
  }

  async test_trash_functions() {
    let results = await this.terminal.getShell().eval("function mop(a,  b  )  { $c = $b - $a  ; return    $c }; mop 10 2");
    this.assertEqual(results, -8);
    results = await this.terminal.getShell().eval("$mop = function (   a,    b  )  { $c = $b - $a  ; return    $c  }; $$mop 10 2");
    this.assertEqual(results, -8);
    results = await this.terminal.getShell().eval("$mop = function (   a,    b  )  { $c = $b - $a  ; return    $c  }; silent print '42' + ($$mop 10 2)");
    this.assertEqual(results.substr(0, 2), '42');
    this.assertEqual(results.substr(2), '-8');
    results = await this.terminal.getShell().eval("$mop = function ()  { return (gen -mi 4 -ma 7) }; $$mop");
    this.assertTrue(results.length > 0);
    results = await this.terminal.getShell().eval("$mop = function ()  { return (gen -mi 4 -ma 7) }; silent print '42' + $$mop");
    this.assertTrue(results.length > 2);
    this.assertEqual(results.substr(0, 2), '42');
    const code = `
      $nums = [1, 2, 3]
      $nums = (arr_map $nums (function (item) { return $item * 2 }))
      $nums = (arr_filter $nums (function (item) { return $item != 4 }))
      arr_reduce $nums 0 (function (a, b) { return $a + $b })
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 8);
  }

  async test_trash_if() {
    let results = await this.terminal.getShell().eval("$num = (gen int -mi 0 -ma 10); if (($num + 10) < 5) { return 66 } else { return 42 }");
    this.assertEqual(results, 42);
    results = await this.terminal.getShell().eval("$num = (gen int -mi 0 -ma 10); if ($num <= 10) { $num = $num + 10; if ($num >= 10) { return 42 }; return 66; } else { return 120 }");
    this.assertEqual(results, 42);
  }

  async test_trash_loop() {
    const results = await this.terminal.getShell().eval("$buff = ''; for ($i = 0; $i < 100; $i += 1) { $buff = $buff + 'A'; }; $buff");
    this.assertTrue(results.length === 100);
  }

  async test_trash_mix() {
    let results = await this.terminal.getShell().eval("$data = {numA: 4, numB:9}; ['te'+ 'st' + '!', $data['numA'], 42]");
    this.assertEqual(results[0], 'test!');
    this.assertEqual(results[1], 4);
    this.assertEqual(results[2], 42);
    results = await this.terminal.getShell().eval(
      "$data = {numA: 4, numB:9}; {'key' + 'A' + '001' + 'K' + 'Z': $data['numA'], (print 'Test Runner') + '_o': 'Val:' + $data['numB'] + '-E', 'key' + $data['numB']: 42}",
    );
    this.assertEqual(results.keyA001KZ, 4);
    this.assertEqual(results['Test Runner_o'], 'Val:9-E');
    this.assertEqual(results.key9, 42);

    let code = `
      function getPartnerCompanies() {
        $res = []
        $partners = (search res.partner -f is_company)
        for ($i = 0; $i < $partners['length']; $i += 1) {
          $partner = $partners[$i]
          if ($partner['is_company']) {
            arr_append $res $partner
          }
        }
        return $res
      }
      getPartnerCompanies
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertTrue(results instanceof Array);
    this.assertTrue(results.length > 0);

    code = `
      $arr = []
      for ($i = 0; $i < 100; $i += 1) {
        if ($i % 2 == 0) {
          continue
        }
        arr_append $arr $i
      }
      $arr
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertTrue(results instanceof Array);
    this.assertEqual(results.length, 50);

    code = `
      $arr = []
      for ($i = 0; $i < 100; $i += 1) {
        if ($i >= 10) {
          break
        }
        arr_append $arr $i
      }
      $arr
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertTrue(results instanceof Array);
    this.assertEqual(results.length, 10);

    code = `
      $arr = false
      if ($arr && $arr['test']) {
        return 'a'
      }
      return 'b'
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 'b');

    code = `
      $arr = false
      $val = true
      if ($arr && $arr['test'] || $val) {
        return 'a'
      }
      return 'b'
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 'a');

    code = `
      function test_paramsA(paramA: Number, paramB: String, paramC: Number = 42) {
        return $paramC;
      }
      test_paramsA 10 'dummy'
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 42);

    code = `
      function test_paramsB(paramA: Number, paramB: String, paramC: Number = 42) {
        return $paramC;
      }
      test_paramsB 10 'dummy' 74
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 74);

    code = `
      function test_paramsC(paramA: Number, paramB: String, paramC: String = '42') {
        return $paramC;
      }
      test_paramsC 10 'dummy'
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, '42');

    code = `
      $var_test = '32'
      function test_paramsD(paramA: Number, paramB: String, paramC: String = $var_test) {
        return $paramC;
      }
      test_paramsD 10 'dummy'
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, '32');
    code = `
      $var_test = '72'
      test_paramsD 10 'dummy'
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, '72');

    code = `
      $var_test = 3;
      if ($var_test == 2) {
        return "A"
      } elif ($var_test == 3) {
        return "B"
      }
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 'B');
    code = `
      $var_test = 2;
      if ($var_test == 2) {
        return "A"
      } elif ($var_test == 3) {
        return "B"
      }
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 'A');
    code = `
      $var_test = 6;
      if ($var_test == 2) {
        return "A"
      } elif ($var_test == 3) {
        return "B"
      } else {
        return "C"
      }
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 'C');
    code = `
      $var_test = 6;
      if ($var_test == 2) {
        return "A"
      } elif ($var_test == 3) {
        return "B"
      }
      return "D"
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 'D');

    code = `
      $var_test = 0;
      for ($i = 0; $i < 2; $i += 1) {
        for ($e = 0; $e < 10; $e += 1) {
          if ($e == 5) {
            break
          }
          $var_test += 1
        }
        $var_test += 1
      }
      return $var_test
    `;
    results = await this.terminal.getShell().eval(code);
    this.assertEqual(results, 12);
  }
}
