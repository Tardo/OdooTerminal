# TraSH

TraSH (Terminal Shell) is the scripting language built into OdooTerminal. It was designed to avoid the use of `eval`
(required to pass browser extension store checks) while remaining more expressive than plain JSON. It is interpreted
by a custom pipeline:

- **Interpreter** (`src/js/page/trash/interpreter.mjs`): tokenises and compiles input into pseudo-bytecode.
- **VMachine** (`src/js/page/trash/vmachine.mjs`): executes the pseudo-bytecode.

---

## Variables

Variables in TraSH are dynamically typed. Function parameters may be optionally typed; the interpreter will attempt
to coerce and validate values to the declared type.

```
$var = 'value'   # declare and assign
$var             # retrieve the value
```

Accessing a dictionary key or array index that does not exist yields `undefined` (a distinct value from `null`):

```
$d = {a: 1}
$d['nope'] == undefined   # true
$d['nope'] == null        # false
```

If a variable holds a function, use `$$` to invoke it:

```
$$myfunc paramA paramB
```

---

## Functions

There are three families of functions:

### Native Functions (TraSH)

Executed entirely within the TraSH VM.

**Named:**

```
function myfun(paramA: Number, paramB: String) {
  print 'Hello: ' + $paramA + ' -- ' + $paramB
}
myfun 10 'world'
```

**Anonymous:**

```
$myfunc = function(paramA: Number, paramB: String) {
  print 'Hello: ' + $paramA + ' -- ' + $paramB
}
$$myfunc 10 'world'
```

### Internal Functions (JavaScript)

Registered in the VM and executed by the JavaScript engine.

```js
async function funcMy(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<number> {
  return 42;
}
```

### Commands (Shell + JavaScript)

Dispatched through the shell and executed by the JavaScript engine.

```js
async function cmdMy(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<number> {
  ctx.screen.print('42');
  return 42;
}
```

---

## Control Flow

### If / Elif / Else

```
if ($a > 10) {
  print 'a'
} elif ($a > 5) {
  print 'b'
} else {
  print 'c'
}
```

---

## Associativity and Order of Evaluation

Evaluation is left to right, with two exceptions:

- Increment/Decrement operators may evaluate right to left.
- Simple assignment (`=`) is right to left.

---

## Operator Precedence

Operators are listed from highest to lowest precedence:

| Precedence | Operator | Symbol |
|---|---|---|
| 1 | Power | `^` |
| 2 | Divide | `/` |
| 3 | Multiply | `*` |
| 4 | Modulo | `%` |
| 5 | Subtract | `-` |
| 6 | Add | `+` |
| 7 | Equal | `==` |
| 8 | Not Equal | `!=` |
| 9 | Greater Than | `>` |
| 10 | Less Than | `<` |
| 11 | Greater Than or Equal | `>=` |
| 12 | Less Than or Equal | `<=` |
| 13 | Logical And | `&&` |
| 14 | Logical Or | `\|\|` |

---

## Built-in Internal Functions

### Math

| Function | Description |
|---|---|
| `abs(x)` | Absolute value of a number |
| `fixed(x, decimals)` | Rounds a number to the nearest integer |
| `floor(x)` | Rounds a number down to the nearest integer |
| `pow(x, y)` | Raises `x` to the power of `y` |
| `rand(min, max)` | Returns a random integer between `min` and `max` (inclusive) |

### Time

| Function | Description |
|---|---|
| `sleep(ms)` | Pauses execution for `ms` milliseconds |
| `pnow()` | Returns a high-resolution timestamp in milliseconds |

### Encoding

| Function | Description |
|---|---|
| `encode(data, format)` | Encodes data (e.g. `base64`) |
| `decode(data, format)` | Decodes data (e.g. `base64`) |

### Network

| Function | Description |
|---|---|
| `fetch(url, options, timeout)` | Performs an HTTP request; returns a `Response` object or `null` on timeout |

### Array

| Function | Description |
|---|---|
| `arr_clone(arr)` | Returns a shallow copy of an array |
| `arr_append(arr, item)` | Appends `item` to the end of `arr` (mutates it in place); returns `arr` |
| `arr_prepend(arr, item)` | Inserts `item` at the beginning of `arr` (mutates it in place); returns `arr` |
| `arr_join(arr, sep = '')` | Joins all items of `arr` into a string, separated by `sep` |
| `arr_reduce(arr, initial, reducer)` | Reduces `arr` to a single value using the `reducer` function |
| `arr_map(arr, mapper)` | Returns a new array with `mapper` applied to each element |
| `arr_filter(arr, filter)` | Returns a new array containing only elements for which `filter` returns true |

### Dictionary

| Function | Description |
|---|---|
| `dict_keys(dict)` | Returns an array with the keys of `dict` |
| `dict_values(dict)` | Returns an array with the values of `dict` |
| `dict_entries(dict)` | Returns an array of `[key, value]` pairs of `dict` |
| `dict_has(dict, key)` | Returns true if `dict` has `key` |
| `dict_get(dict, key, default)` | Returns the value for `key`, or `default` if it does not exist |
| `dict_set(dict, key, value)` | Sets `key` to `value` in `dict` (mutates it in place); returns `dict` |
| `dict_remove(dict, key)` | Removes `key` from `dict` (mutates it in place); returns `dict` |
| `dict_merge(dict, other)` | Returns a new dictionary combining `dict` and `other` (`other` takes precedence) |
| `dict_clone(dict)` | Returns a shallow copy of a dictionary |
| `dict_size(dict)` | Returns the number of keys in `dict` |
