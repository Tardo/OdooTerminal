// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {getArgumentInfo} from '@trash/argument';
import {ARG} from '@trash/constants';
import type {ArgInfo, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';


function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function shortArgType(info: ArgInfo): string {
  if ((info.type & ARG.Flag) === ARG.Flag) return 'flag';
  const isList = (info.type & ARG.List) === ARG.List;
  const base = info.type & ~ARG.List;
  let t;
  if ((base & ARG.Number) === ARG.Number) {
    t = 'num';
  } else if ((base & ARG.Dictionary) === ARG.Dictionary) {
    t = 'dict';
  } else if ((base & ARG.Any) === ARG.Any) {
    t = 'any';
  } else {
    t = 'str';
  }
  if (
    typeof info.strict_values !== 'undefined' &&
    info.strict_values.length > 0
  ) {
    t += `(${info.strict_values.join('|')})`;
  }
  return isList ? `[${t}]` : t;
}

export function buildCommandPrompt(cmd: string, cmd_def: CMDDef): string {
  let result = `- ${cmd}: ${stripHtml(cmd_def.detail)}\n`;
  const parts = [];
  for (const arg of cmd_def.args) {
    const info = getArgumentInfo(arg);
    if (info === null) continue;
    const typeStr = shortArgType(info);
    // "-short/long type=default"
    let part = `-${info.names.short}/${info.names.long}`;
    if (typeStr !== 'flag') {
      part += ` ${typeStr}`;
    }
    if (typeof info.default_value !== 'undefined') {
      if (
        (info.type & ARG.List) === ARG.List ||
        (info.type & ARG.Dictionary) === ARG.Dictionary
      ) {
        part += `=${JSON.stringify(info.default_value) ?? ''}`;
      } else {
        part += `=${new String(info.default_value).toString()}`;
      }
    }
    parts.push(info.is_required ? `<${part}>` : `[${part}]`);
  }
  if (parts.length > 0) {
    result += `  Args: ${parts.join(' ')}\n`;
  }
  if (cmd_def.example) {
    result += `  Example: ${cmd} ${cmd_def.example}\n`;
  }
  return result;
}

// Sections §10–§13: loaded on-demand via the 'trash-syntax' skill.
// Contains control flow, functions, stdlib catalog, and complete examples.
export function buildScriptingPrompt(): string {
  return (
    '=== 10. CONTROL FLOW ===\n' +
    '  * BRACES ARE MANDATORY for all blocks. Omitting braces is a syntax error.\n' +
    '\n' +
    '  if/elif/else:\n' +
    '    if ($x == 2) { return "A" } elif ($x == 3) { return "B" } else { return "C" }\n' +
    '    → if none match and no else, execution continues after the block.\n' +
    '\n' +
    '  for loop (C-style):\n' +
    '    for ($i = 0; $i < 10; $i += 1) { ... }\n' +
    '    → break: exits the innermost loop only.\n' +
    '    → continue: skips to the next iteration.\n' +
    '    → silent before commands inside loops suppresses output clutter.\n' +
    '\n' +
    '  Nested loops — break exits only the INNER loop:\n' +
    '    $n = 0\n' +
    '    for ($i=0; $i<2; $i+=1) {\n' +
    '      for ($e=0; $e<10; $e+=1) { if ($e==5) { break }; $n += 1 }\n' +
    '      $n += 1\n' +
    '    }\n' +
    '\n' +
    '  return: exits current function (or script) and returns a value.\n' +
    '    if ($x > 0) { return "positive" }\n' +
    '    return "non-positive"\n' +
    '\n' +
    '=== 11. FUNCTIONS ===\n' +
    '  * Named function (call by name, no $):\n' +
    '    function myFunc(a, b) { $c = $b - $a; return $c }\n' +
    '    myFunc 10 2   → -8\n' +
    '\n' +
    '  * Anonymous function (stored in variable, call with $$):\n' +
    '    $fn = function(a, b) { return $b - $a }\n' +
    '    $$fn 10 2   → -8\n' +
    '\n' +
    '  * Typed parameters with optional defaults:\n' +
    '    function calc(x: Number, label: String, factor: Number = 42) { return $x * $factor }\n' +
    '    calc 5 "test"        → 210  (uses default factor=42)\n' +
    '    calc 5 "test" 10     → 50   (overrides default)\n' +
    '    → Default can be a variable: function f(a: Number, b: String = $globalVar) { ... }\n' +
    '\n' +
    '  * Pass anonymous function as argument (higher-order):\n' +
    '    $doubled = (arr_map $nums (function (item) { return $item * 2 }))\n' +
    '    $evens   = (arr_filter $nums (function (item) { return $item % 2 == 0 }))\n' +
    '    $sum     = (arr_reduce $nums 0 (function (a, b) { return $a + $b }))\n' +
    '\n' +
    '=== 12. BUILT-IN STDLIB ===\n' +
    '  Array operations (mutate in-place):\n' +
    '    arr_append $arr $item         — append item to end\n' +
    '    arr_prepend $arr $item        — prepend item to start\n' +
    '    $copy = (arr_clone $arr)      — shallow clone\n' +
    '    $res  = (arr_map $arr (function (item) { return $item * 2 }))\n' +
    '    $res  = (arr_filter $arr (function (item) { return $item > 0 }))\n' +
    '    $res  = (arr_reduce $arr 0 (function (a, b) { return $a + $b }))\n' +
    '\n' +
    '  Math:\n' +
    '    floor -n 12.9       → 12\n' +
    '    fixed -n 12.567 -d 2 → 12  (applies .toFixed(d) rounding then truncates to integer)\n' +
    '    abs -n -5           → 5\n' +
    '    pow -b 2 -e 5       → 32\n' +
    '    rand -mi 1 -ma 10   → random integer in [1, 10]\n' +
    '\n' +
    '  Time:\n' +
    '    sleep -t 500        — pause 500 ms\n' +
    '    $ts = (pnow)        — high-resolution timestamp in ms (performance.now)\n' +
    '\n' +
    '  Encoding:\n' +
    '    $enc = (encode -v "hello" -m b64)   → base64 string\n' +
    '    $dec = (decode -v "aGVsbG8=" -m b64) → original string\n' +
    '\n' +
    '  Network:\n' +
    '    $res = (fetch -u "/web/dataset/call_kw" -o {method:"POST"} -t 5000)\n' +
    '    → returns a Response object (or null on timeout). Use with caution.\n' +
    '\n' +
    '=== 13. COMPLETE EXAMPLES ===\n' +
    '  // Sum all sale order totals\n' +
    '  $rows = (search sale.order -f amount_total -all)\n' +
    '  $total = 0\n' +
    '  for ($i = 0; $i < $rows["length"]; $i += 1) { $total += $rows[$i]["amount_total"] }\n' +
    '  print -m "Total: " + $total\n' +
    '\n' +
    '  // Count sale orders per state — shows array literal + loop + count + domain variable\n' +
    '  $states = ["draft", "sale", "done", "cancel"]\n' +
    '  for ($i = 0; $i < $states["length"]; $i += 1) {\n' +
    '    $s = $states[$i]\n' +
    '    $n = (count -m sale.order -d [["state","=",$s]])\n' +
    '    print -m $s + ": " + $n\n' +
    '  }\n' +
    '\n' +
    '  // Collect odd numbers 1–99 using continue\n' +
    '  $arr = []\n' +
    '  for ($i = 0; $i < 100; $i += 1) {\n' +
    '    if ($i % 2 == 0) { continue }\n' +
    '    arr_append $arr $i\n' +
    '  }\n' +
    '  $arr\n' +
    '\n' +
    '  // Create & link: capture ID from create, then open the record\n' +
    '  $r = (create res.partner -v {name:"Test"})\n' +
    '  view res.partner -i $r["id"]\n' +
    '\n' +
    '  // Update a field and commit\n' +
    '  $p = (search res.product.product -l 1)\n' +
    '  $p["lst_price"] = $p["lst_price"] * 1.1\n' +
    '  commit $p\n' +
    '\n' +
    '  // Use arr_map + arr_filter + arr_reduce pipeline\n' +
    '  $nums = [1, 2, 3]\n' +
    '  $nums = (arr_map $nums (function (item) { return $item * 2 }))\n' +
    '  $nums = (arr_filter $nums (function (item) { return $item != 4 }))\n' +
    '  $sum = (arr_reduce $nums 0 (function (a, b) { return $a + $b }))\n' +
    '  print -m "Sum: " + $sum\n' +
    '\n'
  );
}

export default function(terminal: Terminal): string {
  const cmds = terminal.getShell().getVM().getRegisteredCmds();
  const lines = Object.entries(cmds).map(([name, def]) => {
    return buildCommandPrompt(name, def);
  });

  return (
    'TraSH scripting language — follow strictly:\n' +
    '\n' +
    '!!! FUNDAMENTAL RULES — READ BEFORE ANYTHING ELSE !!!\n' +
    '\n' +
    '[RULE 1 — ONE RESULT PER SCRIPT]\n' +
    'A CMD script returns ONE value: the COMPLETE return value of its LAST statement — which may be an array of many records, a dict, a number, etc.\n' +
    '"ONE result" does NOT mean one text line. `search -l 10` returns a JSON array of 10 full records — you see ALL of them at once.\n' +
    '"cmd1; cmd2; cmd3" → the agent receives ONLY cmd3\'s complete return value. cmd1 and cmd2 ran but their results are gone forever.\n' +
    'You CANNOT observe multiple command return values by chaining them. There is no way around this.\n' +
    '\n' +
    'WRONG — assignment is the last statement; assignment returns nothing → "(command executed, no return value)":\n' +
    '  CMD: $products = (search -m product.product -f name,lst_price -l 10)\n' +
    'CORRECT — when you only need one command output, run it directly as the last (and only) statement:\n' +
    '  CMD: search -m product.product -f name,lst_price -l 10\n' +
    'CORRECT — if you must assign first, end with the variable to return its value:\n' +
    '  CMD: $products = (search -m product.product -f name,lst_price -l 10); $products\n' +
    '\n' +
    'WRONG — two CMD lines; you will only see the second result:\n' +
    '  CMD: search res.partner -f name -l 5\n' +
    '  CMD: count -m res.partner\n' +
    'WRONG — same problem in one line with semicolons:\n' +
    '  CMD: search res.partner -f name -l 5; count -m res.partner\n' +
    '\n' +
    'To surface N values in ONE CMD, use one of these patterns:\n' +
    '  Pattern A — print:  $a = (cmd1); $b = (cmd2); print -m "a=" + $a + " b=" + $b\n' +
    '  Pattern B — dict:   $r = {}; $r["val1"] = (cmd1); $r["val2"] = (cmd2); $r\n' +
    'The last statement ($r or print) is the ONE result you will receive.\n' +
    '\n' +
    '[RULE 2 — NO TERNARY OPERATOR — SYNTAX ERROR]\n' +
    '"condition ? a : b" is a SYNTAX ERROR in TraSH. ALWAYS use if/else instead.\n' +
    'FORBIDDEN: $val = ($x > 5) ? "big" : "small"\n' +
    'REQUIRED:  if ($x > 5) { $val = "big" } else { $val = "small" }\n' +
    '\n' +
    '=== 1. SYNTAX BASICS ===\n' +
    '  * Statement separators: ";" and newline (\\n) are equivalent — both end a statement.\n' +
    '    $a = 1; $b = 2   ←→   $a = 1\\n$b = 2   (identical)\n' +
    '  * Comments: // single line comment   /* multi-line comment */\n' +
    '  * Keywords (reserved, cannot be used as names): true false null for function return if elif else silent continue break\n' +
    '\n' +
    '=== 2. LITERALS ===\n' +
    '  * Numbers:     42   -7   3.14   -2.5\n' +
    '  * Strings:     "hello world"  or  \'hello world\'  (both quote styles work)\n' +
    '  * Booleans:    true   false\n' +
    '  * Null:        null\n' +
    '  * Arrays:      [1, 2, 3]   ["a", "b"]   [1, [2, 3], "x"]   (nesting allowed)\n' +
    '  * Dicts:       {key: "val", num: 42}   {key: {nested: [1,2]}}   (nesting allowed)\n' +
    '  * Dict keys can be expressions:  {"key" + $suffix: $val}   {(cmd ...): $val}\n' +
    '  * Subcommands inside literals:   {name: (gen -mi 1 -ma 4)}   [1, (rand -mi 0 -ma 9), 3]\n' +
    '\n' +
    '=== 3. VARIABLES ===\n' +
    '  * Declare & assign:    $var = value\n' +
    '  * Capture cmd output:  $var = (command ...)\n' +
    '  * Array element:       $arr[2] = 42\n' +
    '  * Dict key:            $obj["key"] = "new value"\n' +
    '  * Nested:              $arr[1][0] += 5\n' +
    '  * Compound operators:  += -= *= /=\n' +
    '    Example: $n = 2; $n += 5; $n -= 1; $n *= 2; $n /= 2   → $n == 6\n' +
    '\n' +
    '=== 4. OPERATORS ===\n' +
    '  * Arithmetic:  +  -  *  /  %  (standard math precedence: * / % before + -)\n' +
    '  * Unary minus: $a = 2; $b = 3; $a * -$b   → -6\n' +
    '  * Comparison:  ==  !=  >  <  >=  <=\n' +
    '  * Logic:       &&  ||  !  (short-circuit: right side skipped if left decides result)\n' +
    '    Short-circuit example: $x = false; if ($x && $x["key"]) { ... }  ← safe, no error on false["key"]\n' +
    '  * Grouping:    (expr)  — use parentheses to override precedence\n' +
    '    Example: (((5+5)*2))  → 20\n' +
    '\n' +
    '=== 5. STRINGS & CONCATENATION ===\n' +
    '  * "+" concatenates strings and mixed types (numbers auto-coerce to string).\n' +
    '  * Explicit "+" is MANDATORY — spaces between tokens do NOT concatenate.\n' +
    '    CORRECT: print -m "ID: " + $rec["id"]\n' +
    '    WRONG:   print -m "ID: " $rec["id"]\n' +
    '  * Mixed concat: $a = "blabla"; $b = 1234; $a + "---" + $b   → "blabla---1234"\n' +
    '  * From array/dict: $a[0]["name"] + " | " + $b["total"]\n' +
    '\n' +
    '=== 6. ARGUMENT MAPPING (NAMED & UNNAMED) ===\n' +
    '  * Unnamed (positional) args fill in the order the command defines them.\n' +
    '    Example: create res.partner {name: "Test", street: "Main St"}\n' +
    '  * Named flags: search -m res.partner -d [["active","=",true]]\n' +
    '  * Mix allowed as long as positional order is preserved.\n' +
    '  * QUOTING (MANDATORY): ANY argument value that contains one or more spaces MUST be wrapped in double or single quotes.\n' +
    '    CORRECT:   print -m "hello world"\n' +
    '    CORRECT:   search res.partner -d [["name","=","John Doe"]]\n' +
    '    CORRECT:   search res.partner -o "id DESC, name"    ← order value has spaces, must be quoted\n' +
    '    WRONG:     search res.partner -o id DESC, name      ← "id" is the order value, "DESC," becomes a 3rd arg\n' +
    '    This applies to every command and every argument type (strings, model names, field values, etc.).\n' +
    '  * LIST ARGUMENTS: two equivalent forms are accepted.\n' +
    '    Comma-separated:  name,display_name,phone         (items without spaces need no quotes)\n' +
    '    Array literal:    [name, display_name, phone]     (bare words are strings; variables require $ prefix)\n' +
    '    CORRECT:   search res.partner -f name,display_name\n' +
    '    CORRECT:   search res.partner -f [name, display_name]\n' +
    '    WRONG:     search res.partner -f name,display name ← space makes "display" a 3rd positional arg\n' +
    '\n' +
    '=== 7. SYSTEM HELPERS ($$RMOD, $$RID, $$UID, $$UNAME) ===\n' +
    '  * Use ONLY as standalone arguments — never quote them.\n' +
    '  * NEVER embed inside arrays, dicts, or domain literals.\n' +
    '    CORRECT:   search $$RMOD -d [["active","=",true]]\n' +
    '    FORBIDDEN: [["partner_id","=",$$RID]]\n' +
    '    WORKAROUND: $id = $$RID; search sale.order -d [["partner_id","=",$id]]\n' +
    '\n' +
    '=== 8. SUBCOMMAND CALLS & NESTING ===\n' +
    '  * Wrap in ():  $val = (search res.partner -l 1)\n' +
    '  * Chain access directly: (search res.partner -f name)[0]["name"]\n' +
    '  * Inline in args: read res.users -i (search res.users -f id)[0]["id"]\n' +
    '  * Inside literals: {total: (count -m res.partner)}\n' +
    '\n' +
    '=== 9. RECORDSETS (SINGLETON VS MULTI-RECORD) ===\n' +
    '  * SINGLETON (create, read <single-id>, search -l 1):\n' +
    '    - Access field: $res["field_name"]\n' +
    '    - NEVER index: $res[0]["field"]  ← WRONG on a singleton\n' +
    '  * MULTI-RECORD (search without -l 1):\n' +
    '    - Count: $res["length"]   (never $res["ids"]["length"])\n' +
    '    - Access item: $res[0]["field"], $res[1]["field"]\n' +
    '    - IDs only: $res["ids"]  (plain number array, no field access here)\n' +
    '  * NEVER pass a full recordset to print — always extract specific fields:\n' +
    '    WRONG:                print -m "x: " + $rs\n' +
    '    CORRECT (singleton):  print -m "x: " + $rec["name"]\n' +
    '    CORRECT (multi):      print -m "x: " + $rs[0]["name"]  ← or iterate with a for loop\n' +
    '\n' +
    '(§10–§13: control flow, functions, stdlib, examples → load skill "trash-syntax" before writing scripts with loops, functions, or stdlib calls)\n' +
    '\n' +
    '=== AVAILABLE COMMANDS (SYNTAX NOTATION) ===\n' +
    'Notation: <-flag/name type=default> required, [-flag/name type=default] optional\n' +
    'Types: str, num, flag, dict, any, [x]=list of x, str(a|b)=enum\n' +
    'Only use the following registered commands:\n' +
    lines.join('\n')
  );
}
