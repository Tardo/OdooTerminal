// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {getArgumentInfo} from '@tardo/trash/argument';
import {ARG} from '@tardo/trash/constants';
import type {ArgInfo, CMDDef} from '@tardo/trash/interpreter';
import {FUNCTION_TYPE} from '@tardo/trash/function';
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
    '  * BRACES ARE MANDATORY for all blocks — omitting them is a syntax error.\n' +
    '  if/elif/else:  if ($x == 2) { return "A" } elif ($x == 3) { return "B" } else { return "C" }\n' +
    '    → if none match and no else, execution continues after the block.\n' +
    '  Loops:\n' +
    '    for ($i = 0; $i < 10; $i++) { ... }      C-style ($i++ ←→ $i += 1, $i-- ←→ $i -= 1)\n' +
    '    for ($item in $items) { ... }            for-in: $items must be an ARRAY (or string), NOT a dict; "of" does not exist\n' +
    '    break exits the INNERMOST loop only; continue skips to the next iteration.\n' +
    '    Initialize accumulators BEFORE the loop/block so their values remain available afterwards.\n' +
    '    Agent calls already suppress command output; silent is NOT error recovery: callback errors still propagate in run_command.\n' +
    '    Keep loops bounded; execution, collection, string, and nesting limits apply. Prefer filtered queries to fetching everything.\n' +
    '  return: exits the current function (or script) with a value.\n' +
    '\n' +
    '=== 11. FUNCTIONS ===\n' +
    '  * Named (call by name, no $):   function myFunc(a, b) { return $b - $a }   →   myFunc 10 2   → -8\n' +
    '  * Anonymous stored in variable: $fn = function(a, b) { return $b - $a }\n' +
    '      $$fn 10 2   → -8  (COMMAND position)        ($$fn 10 2)   → -8  (inside a subexpression)\n' +
    '  * TraSH 2.3.0 uses LEXICAL scope: functions capture the environment where they are DEFINED, not caller-local variables.\n' +
    '      Assignments update the nearest existing binding; parameters shadow outer names. Captured bindings are shared, not copied.\n' +
    '      Pass caller-specific values as explicit arguments. Closures keep their captured variables after the defining call ends.\n' +
    '      Named functions cannot replace existing commands. Prefer $fn = function(...) { ... } for helpers you may redefine.\n' +
    '  * $$ call rules — position matters:\n' +
    '    COMMAND position (first token of a statement or after ;): $$fn arg1 arg2 — following tokens are arguments, call fires at end-of-statement.\n' +
    '    ARGUMENT position (NOT the first token) — depends on the function signature:\n' +
    '      - 0 parameters → called immediately, result used as the value:  silent print "user: " + $$UNAME   → "user: admin"\n' +
    '      - ≥1 parameters → reference passed, NOT called:  arr_map [1,2,3] $$sq   (sq becomes the mapper callback)\n' +
    '      - Force a call regardless of signature with a LogicBlock:  silent print "val: " + ($$fn 5)\n' +
    '  * Typed parameters with optional defaults (a default can be a variable: b: String = $globalVar):\n' +
    '      function calc(x: Number, label: String, factor: Number = 42) { return $x * $factor }\n' +
    '      calc 5 "test" → 210 (default)        calc 5 "test" 10 → 50\n' +
    '  * Callbacks for higher-order functions:\n' +
    '      Inline anonymous (always correct):  $doubled = (arr_map $nums (function (item) { return $item * 2 }))\n' +
    '      Prefer $fn for ALL callback references, including zero-parameter callbacks: $sq = function (x) { return $x * $x }; arr_map [1,2,3] $sq\n' +
    '      $$fn is for invocation; using it for a zero-parameter callback invokes it too early.\n' +
    '      Callbacks apply parameter validation/defaults; extra helper-supplied arguments are ignored when not declared.\n' +
    '\n' +
    '=== 12. BUILT-IN STDLIB ===\n' +
    '  Arrays (arr_append/arr_prepend mutate in-place; transformations below return new arrays):\n' +
    '    arr_append $arr $item · arr_prepend $arr $item · $copy = (arr_clone $arr) · $str = (arr_join $arr ",")  (separator optional, default none)\n' +
    '    $res = (arr_map $arr (function (item) { return $item * 2 }))\n' +
    '    $res = (arr_filter $arr (function (item) { return $item > 0 }))\n' +
    '    $res = (arr_reduce $arr 0 (function (a, b) { return $a + $b }))\n' +
    '    (arr_slice $arr 1 3) → shallow slice [1,3), end optional, negative indices allowed\n' +
    '    (arr_includes $arr $value) → boolean · (arr_reverse $arr) · (arr_unique $arr) → first occurrence order\n' +
    '    includes/unique do not coerce types; objects compare by identity. Use plain arrays for these helpers.\n' +
    '  Dictionaries (dict_set/dict_remove mutate in-place, others do not):\n' +
    '    $keys = (dict_keys $dict) · $values = (dict_values $dict) · $pairs = (dict_entries $dict)  → array of [key, value]\n' +
    '    (dict_has $dict "k") → boolean · (dict_get $dict "k" $default) · (dict_size $dict) → number of keys\n' +
    '    dict_set $dict "k" $v · dict_remove $dict "k" · $copy = (dict_clone $dict) · $merged = (dict_merge $dict1 $dict2)  (dict2 wins on key conflicts)\n' +
    '  Strings:\n' +
    '    (str_split -s $str -d ",") → array · (str_upper -s $str) · (str_lower -s $str) · (str_trim -s $str)\n' +
    '    (str_replace -s $str -f "a" -r "b")  first occurrence; add -a for all\n' +
    '    (str_slice -s $str -b 0 -e 5)  substring [0,5) · (str_slice -s $str -b -3)  last 3 chars\n' +
    '    (str_includes -s $str -n "needle") · (str_starts -s $str -p "prefix") · (str_ends -s $str -u "suffix")  → booleans\n' +
    '  Math:\n' +
    '    floor -n 12.9 → 12 · abs -n -5 → 5 · pow -b 2 -e 5 → 32 · rand -mi 1 -ma 10 → random integer in [1, 10]\n' +
    '    ceil -n -1.8 → -1 · round -n -1.5 → -1 (ties toward +infinity) · trunc -n -1.8 → -1\n' +
    '    fixed -n 3.7 -d 0 → 4   (rounds via .toFixed(d), then truncates to INTEGER — never returns decimals)\n' +
    '  Time:      sleep -t 500  (pause 500 ms) · $ts = (pnow)  high-resolution ms timestamp\n' +
    '  Encoding:  $enc = (encode -v "hello" -m b64) · $dec = (decode -v "aGVsbG8=" -m b64)\n' +
    '  Network:   $res = (fetch -u "/web/dataset/call_kw" -o {method:"POST"} -t 5000) → native Response, or null on timeout. Its inherited methods are not script-accessible; prefer Odoo commands for ORM/RPC data.\n' +
    '\n' +
    '=== 13. COMPLETE EXAMPLES ===\n' +
    '  // Conditional value: only the selected branch executes\n' +
    '  $qty = 0; $total = 120; $average = $qty > 0 ? $total / $qty : 0; $average\n' +
    '\n' +
    '  // Lexical closure: the caller parameter does not replace the captured $factor\n' +
    '  $factor = 2; $scale = function (n) { return $n * $factor }\n' +
    '  $caller = function (factor) { return ($$scale 3) }; $$caller 100  // returns 6\n' +
    '\n' +
    '  // Sum a bounded sample (NOT the full model total); verify amount_total with caf first\n' +
    '  $rows = (search -m sale.order -f amount_total -l 100)\n' +
    '  $total = 0\n' +
    '  for ($i = 0; $i < $rows["length"]; $i += 1) { $total += $rows[$i]["amount_total"] }\n' +
    '  $total  // expose the computed value to run_command\n' +
    '\n' +
    '  // Count sale orders per state — use state values verified on this instance\n' +
    '  $states = ["draft", "sale", "cancel"]\n' +
    '  $counts = {}\n' +
    '  for ($i = 0; $i < $states["length"]; $i += 1) {\n' +
    '    $s = $states[$i]\n' +
    '    $n = (count -m sale.order -d [["state","=",$s]])\n' +
    '    $counts[$s] = $n\n' +
    '  }\n' +
    '  $counts\n' +
    '\n' +
    '  // Create & read back: capture ID from create, then read the record\n' +
    '  $r = (create res.partner -v {name:"Test"})\n' +
    '  read res.partner -i $r["id"]\n' +
    '\n' +
    '  // Update a field and commit\n' +
    '  $p = (search -m product.product -l 1)\n' +
    '  $p["lst_price"] = $p["lst_price"] * 1.1\n' +
    '  commit $p\n' +
    '\n'
  );
}

// One-line hint per non-core category, shown so the model knows such commands exist and
// where to get their syntax before it needs them — without preloading the syntax itself.
const CATEGORY_HINTS: {[string]: string} = {
  system: 'session/instance admin — login, modules, DB, system params, upgrades',
  devtools: 'diagnostics & data tools — introspection, testing, import/export, AI/watchdog config',
  ui: 'UI actions — menu actions, effects, notifications',
  terminal: 'terminal/shell features (aliases, jobs, scripting utilities) — not Odoo data',
  stdlib: 'array/dict/string/math/time/encoding helpers — already covered by skill "trash-syntax" §12, no need for help',
  graphics: '2D drawing/canvas (charts, shapes, diagrams) — already covered by skill "graphics", no need for help',
};

export default function(terminal: Terminal): string {
  const cmds = terminal.getShell().getVM().getRegisteredCmds();
  const entries = Object.entries(cmds).filter(([_name, def]) => def.type === FUNCTION_TYPE.Command || def.type === FUNCTION_TYPE.Internal);
  const lines = entries.filter(([_name, def]) => def.category === 'core').map(([name, def]) => {
    return buildCommandPrompt(name, def);
  });

  const otherCategoryCounts: Map<string, number> = new Map();
  for (const [, def] of entries) {
    if (def.category === 'core') continue;
    otherCategoryCounts.set(def.category, (otherCategoryCounts.get(def.category) ?? 0) + 1);
  }
  const otherCategories = [...otherCategoryCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, count]) => `  - ${cat} (${count} commands): ${CATEGORY_HINTS[cat] ?? ''}`)
    .join('\n');

  return (
    'TraSH 2.3.0 scripting language with @tardo/trash-stdlib 2.0.0 — follow strictly. This is NOT JavaScript or Python.\n' +
    '\n' +
    '!!! FUNDAMENTAL RULES !!!\n' +
    '\n' +
    '[RULE 1 — SCRIPT RESULTS]\n' +
    'Pass raw TraSH source in run_command.cmd, without a CMD: prefix or Markdown fences.\n' +
    'A script returns the result of EACH top-level value-producing statement (one not nested inside an assignment, a subcommand () or a block {}):\n' +
    '  • ONE top-level statement → you receive its value directly.\n' +
    '  • TWO OR MORE → you receive a JSON array, one entry per statement, in order.\n' +
    'Assignments ($var = ...) execute but return NOTHING — only assign when $var is reused LATER; a one-off value needs no variable:\n' +
    '  WRONG:    $products = (search -m product.product -f name -l 10)             → "(command executed, no return value)"\n' +
    '  NEEDLESS: $products = (search -m product.product -f name -l 10); $products  → works, but pointless — nothing reuses $products\n' +
    '  CORRECT:  search -m product.product -f name -l 10                           → same result, no $var needed\n' +
    'Use one run_command call per step; combine known operations with ";", then inspect the result before dependent discovery steps:\n' +
    '  search -m res.partner -f name -l 5; count -m res.partner   → [<partners array>, <count>]\n' +
    'For computations, end with $result or a compact dict/array of needed values. Variables persist in this terminal until reset; only reuse bindings you have actually defined.\n' +
    '\n' +
    '[RULE 2 — CONDITIONAL EXPRESSIONS]\n' +
    'TraSH 2.3.0 supports condition ? value_if_true : value_if_false; ONLY the selected branch executes.\n' +
    '  $val = $x > 5 ? "big" : "small"\n' +
    'It has lower precedence than arithmetic/comparisons/logic and nests right-to-left. Parenthesize it in command arguments: print -m ($x > 5 ? "big" : "small").\n' +
    'Use if/elif/else with braces for multi-statement branches.\n' +
    '\n' +
    '[RULE 3 — LOOP FORMS]\n' +
    '  for ($i = 0; $i < 10; $i++) { ... }     C-style\n' +
    '  for ($item in $items) { ... }           $items MUST be an array (e.g. search results) or a string — NOT a dict\n' +
    '"for ($x of ...)" does NOT exist — use "in".\n' +
    '\n' +
    '=== 1. SYNTAX BASICS ===\n' +
    '  * ";" and newline are equivalent statement separators. Comments: // line   /* block */ — start at input start or after whitespace, outside strings.\n' +
    '  * Reserved keywords: true false null undefined for function return if elif else silent continue break\n' +
    '\n' +
    '=== 2. LITERALS ===\n' +
    '  * Numbers: 42  -7  3.14 · Strings: "x" or \'x\' (escapes \\" \\\' \\\\ \\n; unknown escapes kept as-is) · true false null undefined\n' +
    '  * Accessing a missing dict key or array index yields undefined (comparable: $d["nope"] == undefined).\n' +
    '  * Only own properties are readable; inherited JS/DOM methods are unavailable. Keys must be strings/numbers; __proto__, constructor, prototype are forbidden.\n' +
    '  * Arrays [1, [2, 3], "x"] and dicts {key: "val", num: 42} — nesting allowed.\n' +
    '  * Dict keys can be expressions: {"key" + $suffix: $val}. Subcommands allowed inside literals: {total: (count -m res.partner)}\n' +
    '\n' +
    '=== 3. VARIABLES ===\n' +
    '  * $var = value · capture command output: $var = (command ...)\n' +
    '    → The ENTIRE outer command must be wrapped in (), even when it already has subcommand args inside:\n' +
    '      WRONG:   $rec = read res.users -i (search -m res.users -f id)[0]["id"]    ← outer not wrapped, nothing captured\n' +
    '      CORRECT: $rec = (read res.users -i (search -m res.users -f id)[0]["id"])\n' +
    '  * Elements: $arr[2] = 42   $obj["key"] = "v"   $arr[1][0] += 5 · compound operators: += -= *= /=\n' +
    '  * $i++ / ++$i ←→ $i += 1   $i-- / --$i ←→ $i -= 1   (write attached: $i++, NOT $i ++; as a statement also on elements: $arr[0]++)\n' +
    '    Inside expressions POSTFIX yields the OLD value, PREFIX the NEW ($i = 5; $a = $i++ → $a == 5, $i == 6) and only works on plain variables ($a = $arr[0]++ is an ERROR).\n' +
    '\n' +
    '=== 4. OPERATORS ===\n' +
    '  * Arithmetic + - * / % (standard precedence) and unary minus ($a * -$b). Comparison == != > < >= <=. Grouping: (expr).\n' +
    '  * Logic && || ! short-circuit: $x = false; if ($x && $x["key"]) { ... }  ← safe, no error on false["key"]\n' +
    '\n' +
    '=== 5. STRING CONCATENATION ===\n' +
    '  * "+" concatenates strings and mixed types (numbers auto-coerce). Explicit "+" is MANDATORY — spaces do NOT concatenate:\n' +
    '    CORRECT: print -m "ID: " + $rec["id"]      WRONG: print -m "ID: " $rec["id"]\n' +
    '  * From array/dict: $a[0]["name"] + " | " + $b["total"]\n' +
    '\n' +
    '=== 6. ARGUMENTS & QUOTING ===\n' +
    '  * Positional args fill in definition order (create res.partner {name: "Test"}); named flags may mix with them if positional order is preserved.\n' +
    '  * Flags use -short or --long (e.g. -m or --model), NOT -model.\n' +
    '  * QUOTING (MANDATORY): ANY argument value containing spaces MUST be quoted — every command, every argument type.\n' +
    '    CORRECT: search -m res.partner -o "id DESC, name"      WRONG: search -m res.partner -o id DESC, name  ← "DESC," becomes a 3rd arg\n' +
    '  * List arguments, two equivalent forms: name,display_name (items without spaces) or [name, display_name] (bare words are strings; variables need $).\n' +
    '    WRONG: -f name,display name  ← the space makes "name" a 3rd positional arg\n' +
    '\n' +
    '=== 7. SYSTEM HELPERS ($$RMOD, $$RID, $$UID, $$UNAME) ===\n' +
    '  * Zero-parameter functions, auto-called in value position, including arrays/dicts/domains. NEVER quote them.\n' +
    '    search -m $$RMOD -d [["id","=",$$RID]] · {user_id: $$UID} · print -m "user: " + $$UNAME\n' +
    '    $$RID is the current record ID in $$RMOD, NOT automatically a partner/user ID. Capture once in $id if reused.\n' +
    '\n' +
    '=== 8. SUBCOMMAND CALLS & NESTING ===\n' +
    '  * Subcommands used as values run silently and still return their value; nested function calls inherit this silence. In print $$RID or print (rid), only the outer print produces output.\n' +
    '  * Wrap in (): $val = (search -m res.partner -l 1) · chain access: (search -m res.partner -f name)[0]["name"]\n' +
    '  * Inline in args: read res.users -i (search -m res.users -f id)[0]["id"] · inside literals: {total: (count -m res.partner)}\n' +
    '  * A command used as an ARGUMENT VALUE must ALWAYS be wrapped in () — without them the inner command name becomes a literal string and its flags leak into the OUTER command:\n' +
    '    WRONG:   print -m now -t date      ← prints the string "now"; -t is not a print arg → error\n' +
    '    CORRECT: print -m (now -t date)\n' +
    '\n' +
    '=== 9. RECORDSETS (SINGLETON VS MULTI-RECORD) ===\n' +
    '  * SINGLETON (create, read <single-id>, search -l 1): access fields directly — $res["field_name"].\n' +
    '  * MULTI (search without -l 1): count $res["length"] (NEVER $res["ids"]["length"]); items $res[0]["field"]; IDs only $res["ids"] (plain number array).\n' +
    '  * NEVER pass a full recordset to print — extract fields: print -m "x: " + $rs[0]["name"] (or iterate with a for loop).\n' +
    '\n' +
    '=== DOMAINS (-d/--domain args) ===\n' +
    '  * Array of [field, operator, value] tuples; consecutive tuples are AND by default: [["state","=","draft"],["active","=",true]]\n' +
    '  * OR joins the NEXT two terms (prefix "|", Polish notation), NOT wraps ONE term (prefix "!"):\n' +
    '    ["|",["priority","=","1"],["priority","=","2"]]  → priority is 1 OR 2\n' +
    '    [["state","=","draft"],"!",["priority","=","0"]]   → state=draft AND NOT priority=0\n' +
    '  * Operators: = != > < >= <= like ilike not like not ilike in not in child_of parent_of\n' +
    '  * Related fields: dot path — [["partner_id.country_id.code","=","ES"]]\n' +
    '  * List values: [["id","in",[1,2,3]]] · empty domain [] matches all records.\n' +
    '\n' +
    '(§10–§13: control flow, functions, stdlib, examples → load skill "trash-syntax" before writing scripts with loops, functions, or stdlib calls)\n' +
    '\n' +
    '=== AVAILABLE COMMANDS (SYNTAX NOTATION) ===\n' +
    'Notation: <-flag/name type=default> required, [-flag/name type=default] optional; -flag/name means either -flag or --name, never type the slash.\n' +
    'Types: str, num, flag, dict, any, [x]=list of x, str(a|b)=enum\n' +
    'Core commands — always available, no preloading needed:\n' +
    lines.join('\n') +
    '\n\n' +
    '=== OTHER COMMAND CATEGORIES (NOT PRELOADED) ===\n' +
    'These commands exist and are usable, but their syntax is intentionally not loaded above to save tokens.\n' +
    'Before using ANY command not in the list above, run `help --category <name>` via run_command to get its exact syntax first — never guess flags.\n' +
    'A category dump can be long; if you only need ONE command from it, `help -c <cmd>` returns just that one.\n' +
    otherCategories + '\n'
  );
}
