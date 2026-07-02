// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {getArgumentInfo} from '@trash/argument';
import {ARG} from '@trash/constants';
import type {ArgInfo, CMDDef} from '@trash/interpreter';
import {FUNCTION_TYPE} from '@trash/function';
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
    '  for loop (two forms):\n' +
    '    for ($i = 0; $i < 10; $i++) { ... }      C-style ($i++ ←→ $i += 1, $i-- ←→ $i -= 1)\n' +
    '    for ($item in $items) { ... }            for-in: $items must be an ARRAY (or string), NOT a dict\n' +
    '    → "for ($x of ...)" does NOT exist; use "in".\n' +
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
    '  * Anonymous function stored in variable:\n' +
    '    $fn = function(a, b) { return $b - $a }\n' +
    '    $$fn 10 2          → -8   (call at COMMAND position: $$ + name + args)\n' +
    '    ($$fn 10 2)        → -8   (call inside a subexpression)\n' +
    '\n' +
    '  * $$ call rules — position matters:\n' +
    '    COMMAND position (first token of a statement or after ;):\n' +
    '      $$fn arg1 arg2   → tokens after $$ are collected as arguments, call fires at end-of-statement\n' +
    '    ARGUMENT position (NOT the first token) — behaviour depends on the function signature:\n' +
    '      - Function with 0 parameters: called immediately, result used as the argument value\n' +
    '          silent print "user: " + $$UNAME      → "user: admin"  (UNAME called, result concatenated)\n' +
    '      - Function with ≥1 parameters: reference passed, NOT called\n' +
    '          arr_map [1,2,3] $$sq                 → sq itself becomes the mapper callback\n' +
    '    To force a call at argument position regardless of signature, use a LogicBlock:\n' +
    '          silent print "val: " + ($$fn 5)      → fn(5) called, result concatenated\n' +
    '\n' +
    '  * Typed parameters with optional defaults:\n' +
    '    function calc(x: Number, label: String, factor: Number = 42) { return $x * $factor }\n' +
    '    calc 5 "test"        → 210  (uses default factor=42)\n' +
    '    calc 5 "test" 10     → 50   (overrides default)\n' +
    '    → Default can be a variable: function f(a: Number, b: String = $globalVar) { ... }\n' +
    '\n' +
    '  * Pass function as callback to higher-order functions:\n' +
    '    Inline anonymous (always correct):\n' +
    '      $doubled = (arr_map $nums (function (item) { return $item * 2 }))\n' +
    '      $evens   = (arr_filter $nums (function (item) { return $item % 2 == 0 }))\n' +
    '      $sum     = (arr_reduce $nums 0 (function (a, b) { return $a + $b }))\n' +
    '    Variable reference with $  (always correct):\n' +
    '      $sq = function (x) { return $x * $x }\n' +
    '      $res = (arr_map [1,2,3,4,5] $sq)         → [1,4,9,16,25]\n' +
    '    Variable reference with $$ (correct when function has ≥1 parameters):\n' +
    '      $res = (arr_map [1,2,3,4,5] $$sq)        → [1,4,9,16,25]  (same result)\n' +
    '\n' +
    '=== 12. BUILT-IN STDLIB ===\n' +
    '  Array operations (mutate in-place):\n' +
    '    arr_append $arr $item         — append item to end\n' +
    '    arr_prepend $arr $item        — prepend item to start\n' +
    '    $copy = (arr_clone $arr)      — shallow clone\n' +
    '    $str  = (arr_join $arr)       — join into string with no separator\n' +
    '    $str  = (arr_join $arr ",")   — join into string with separator\n' +
    '    $res  = (arr_map $arr (function (item) { return $item * 2 }))\n' +
    '    $res  = (arr_filter $arr (function (item) { return $item > 0 }))\n' +
    '    $res  = (arr_reduce $arr 0 (function (a, b) { return $a + $b }))\n' +
    '\n' +
    '  String operations:\n' +
    '    $arr  = (str_split -s $str -d ",")          — split by delimiter → array\n' +
    '    $up   = (str_upper -s $str)                 — uppercase\n' +
    '    $lo   = (str_lower -s $str)                 — lowercase\n' +
    '    $t    = (str_trim -s $str)                  — strip leading/trailing whitespace\n' +
    '    $r    = (str_replace -s $str -f "a" -r "b") — replace first occurrence\n' +
    '    $r    = (str_replace -s $str -f "a" -r "b" -a) — replace all occurrences\n' +
    '    $sub  = (str_slice -s $str -b 0 -e 5)       — substring [0,5)\n' +
    '    $sub  = (str_slice -s $str -b -3)            — last 3 chars\n' +
    '    $bool = (str_includes -s $str -n "needle")  — true if contains substring\n' +
    '    $bool = (str_starts -s $str -p "prefix")    — true if starts with prefix\n' +
    '    $bool = (str_ends -s $str -u "suffix")      — true if ends with suffix\n' +
    '\n' +
    '  Math:\n' +
    '    floor -n 12.9       → 12\n' +
    '    fixed -n 3.7 -d 0   → 4   (rounds via .toFixed(d), then truncates to INTEGER — never returns decimals)\n' +
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
    '  $rows = (search -m sale.order -f amount_total -all)\n' +
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
    '  // Create & read back: capture ID from create, then read the record\n' +
    '  $r = (create res.partner -v {name:"Test"})\n' +
    '  read res.partner -i $r["id"]\n' +
    '\n' +
    '  // Update a field and commit\n' +
    '  $p = (search -m product.product -l 1)\n' +
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
  const lines = Object.entries(cmds).filter(([_name, def]) => def.type === FUNCTION_TYPE.Command).map(([name, def]) => {
    return buildCommandPrompt(name, def);
  });

  return (
    'TraSH scripting language — follow strictly:\n' +
    '\n' +
    '!!! FUNDAMENTAL RULES — READ BEFORE ANYTHING ELSE !!!\n' +
    '\n' +
    '[RULE 1 — SCRIPT RESULTS]\n' +
    'A CMD script returns the result of EACH top-level statement.\n' +
    '  • ONE top-level statement  → you receive its value directly.\n' +
    '  • TWO OR MORE top-level statements → you receive a JSON array, one entry per statement, in order.\n' +
    '"Top-level" means not nested inside an assignment, subcommand (), or block {}.\n' +
    'Assignments ($var = ...) contribute NOTHING to the result — they execute but return no value.\n' +
    '\n' +
    'EXAMPLE — single command (one result, not wrapped):\n' +
    '  CMD: search -m product.product -f name,lst_price -l 10\n' +
    '  → receives the array of matching records\n' +
    '\n' +
    'EXAMPLE — two commands in one CMD (both results returned):\n' +
    '  CMD: search -m res.partner -f name -l 5; count -m res.partner\n' +
    '  → receives [<array of 5 partners>, <total count>]\n' +
    '\n' +
    'WRONG — assignment is a top-level statement but returns nothing:\n' +
    '  CMD: $products = (search -m product.product -f name,lst_price -l 10)\n' +
    '  → receives "(command executed, no return value)"\n' +
    'CORRECT — read the variable back to surface its value:\n' +
    '  CMD: $products = (search -m product.product -f name,lst_price -l 10); $products\n' +
    '  → receives the array of products\n' +
    '\n' +
    'WRONG — multiple CMD lines violate the response protocol (one CMD per turn):\n' +
    '  CMD: search -m res.partner -f name -l 5\n' +
    '  CMD: count -m res.partner\n' +
    'CORRECT — combine in a single CMD to get both results at once:\n' +
    '  CMD: search -m res.partner -f name -l 5; count -m res.partner\n' +
    '  → receives [<partners array>, <count number>]\n' +
    '\n' +
    '[RULE 2 — NO TERNARY OPERATOR — SYNTAX ERROR]\n' +
    '"condition ? a : b" is a SYNTAX ERROR in TraSH. ALWAYS use if/else instead.\n' +
    'FORBIDDEN: $val = ($x > 5) ? "big" : "small"\n' +
    'REQUIRED:  if ($x > 5) { $val = "big" } else { $val = "small" }\n' +
    '\n' +
    '[RULE 3 — LOOP FORMS]\n' +
    'Two loop forms exist — C-style and for-in:\n' +
    '  for ($i = 0; $i < 10; $i++) { ... }\n' +
    '  for ($item in $items) { ... }        ← $items MUST be an array (e.g. search results) or a string\n' +
    'for-in does NOT work on dicts. "for ($x of ...)" does NOT exist — use "in".\n' +
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
    '  * Escapes:     \\" \\\' \\\\ \\n inside strings → "say \\"hi\\""   \'it\\\'s ok\'   "line1\\nline2"  (unknown escapes are kept as-is)\n' +
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
    '    → The ENTIRE outer command must be wrapped in () — even when it already has subcommand args inside:\n' +
    '      WRONG:   $rec = read res.users -i (search -m res.users -f id)[0]["id"]    ← outer not wrapped, nothing captured\n' +
    '      CORRECT: $rec = (read res.users -i (search -m res.users -f id)[0]["id"])  ← outer wrapped, result captured\n' +
    '  * Array element:       $arr[2] = 42\n' +
    '  * Dict key:            $obj["key"] = "new value"\n' +
    '  * Nested:              $arr[1][0] += 5\n' +
    '  * Compound operators:  += -= *= /=\n' +
    '    Example: $n = 2; $n += 5; $n -= 1; $n *= 2; $n /= 2   → $n == 6\n' +
    '  * Increment/decrement:  $i++ / ++$i ←→ $i += 1   $i-- / --$i ←→ $i -= 1   (write attached: $i++, NOT $i ++)\n' +
    '    As a statement both forms work, also on elements: $arr[0]++   ++$arr[0]\n' +
    '    Inside expressions, POSTFIX yields the OLD value; PREFIX yields the NEW value:\n' +
    '      $i = 5; $a = $i++   → $a == 5, $i == 6\n' +
    '      $i = 5; $a = ++$i   → $a == 6, $i == 6\n' +
    '    The expression form only works on plain variables: $a = $arr[0]++ is an ERROR.\n' +
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
    '    CORRECT:   search -m res.partner -d [["name","=","John Doe"]]\n' +
    '    CORRECT:   search -m res.partner -o "id DESC, name"    ← order value has spaces, must be quoted\n' +
    '    WRONG:     search -m res.partner -o id DESC, name      ← "id" is the order value, "DESC," becomes a 3rd arg\n' +
    '    This applies to every command and every argument type (strings, model names, field values, etc.).\n' +
    '  * LIST ARGUMENTS: two equivalent forms are accepted.\n' +
    '    Comma-separated:  name,display_name,phone         (items without spaces need no quotes)\n' +
    '    Array literal:    [name, display_name, phone]     (bare words are strings; variables require $ prefix)\n' +
    '    CORRECT:   search -m res.partner -f name,display_name\n' +
    '    CORRECT:   search -m res.partner -f [name, display_name]\n' +
    '    WRONG:     search -m res.partner -f name,display name ← space makes "display" a 3rd positional arg\n' +
    '\n' +
    '=== 7. SYSTEM HELPERS ($$RMOD, $$RID, $$UID, $$UNAME) ===\n' +
    '  * These are zero-parameter functions. When used as arguments they are called\n' +
    '    automatically and their return value is passed to the command.\n' +
    '  * NEVER quote them, and NEVER embed inside arrays, dicts, or domain literals.\n' +
    '    CORRECT:   search -m $$RMOD -d [["active","=",true]]\n' +
    '    CORRECT:   print -m "user: " + $$UNAME\n' +
    '    FORBIDDEN: [["partner_id","=",$$RID]]\n' +
    '    WORKAROUND: $id = $$RID; search -m sale.order -d [["partner_id","=",$id]]\n' +
    '\n' +
    '=== 8. SUBCOMMAND CALLS & NESTING ===\n' +
    '  * Wrap in ():  $val = (search -m res.partner -l 1)\n' +
    '  * Chain access directly: (search -m res.partner -f name)[0]["name"]\n' +
    '  * Inline in args: read res.users -i (search -m res.users -f id)[0]["id"]\n' +
    '  * Inside literals: {total: (count -m res.partner)}\n' +
    '\n' +
    '=== 9. RECORDSETS (SINGLETON VS MULTI-RECORD) ===\n' +
    '  * SINGLETON (create, read <single-id>, search -l 1):\n' +
    '    - Access field directly: $res["field_name"]   ($res[0]["field"] also works, but the [0] is unnecessary)\n' +
    '  * MULTI-RECORD (search -m without -l 1):\n' +
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
