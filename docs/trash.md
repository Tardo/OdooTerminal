# TraSH

TraSH is the language used in the Terminal. It is necessary to circumvent the use of 'eval' (necessary to pass the
extension store checks) and not have the limitations of JSON. This is my own implementation simply because I felt like
doing something like this... but maybe it's not the best of my ideas... at least it seems to work and meet expectations.

## Components

- Interpreter: Compile input string into pseudo-bytecode
- VMachine: Runs the pseudo-bytecode

# FAST REFERENCE

## Variables

Variables in TraSH do not have a type. Function parameters can be typed. The interpreter will try to convert and
validate the types.

To declare a variable: `$var = 'value'` To retrieve the value: `$var`

If the variable is of type 'function', it is used `$$` to invoke: `$$mifunc paramA paramB`

## Functions

There are three families of functions:

- Native functions: Are executed entirely by the TraSH vm (ofc js vm is used internally).

  - Normal (named):
    ```
    function myfun(paramA: Number, paramB: String) { print 'Hello World: ' + $paramA + ' -- ' + $paramB }
    ```
    ```
    myfunc 10 'Yo'
    ```
  - Anonymous:
    ```
    $myfunc = function(paramA: Number, paramB: String) { print 'Hello World: ' + $paramA + ' -- ' + $paramB }
    ```
    ```
    $$myfunc 10 'Yo'
    ```

- Internal functions: Are executed by the JavaScript vm

  **In JavaScript (flow typed)**

  ```js
  async function funcMy(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<number> { return 42; }
  ```

- Commands: Are executed by the shell and the JavaScript vm

  **In JavaScript (flow typed)**

  ```js
  async function cmdMy(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<number> { ctx.screen.print('O_o 42!'); return 42; }
  ```

## If-Elif-Else

```
  if ($a > 10) {
    print 'a'
  } elif ($a > 5) {
    print 'b'
  } else {
    print 'c'
  }
```

## Associativity & Order of Evaluation

Left to Right

- \*\* Increment/Decrement can be 'Right to Left'
- \*\* 'Simple assigment' is 'Right to Left'

## Operators Precedence

1. POW: ^
2. DIVIDE: /
3. MULTIPLY: \*
4. MODULO: %
5. SUBSTRACT: -
6. ADD: +
7. EQUAL: ==
8. NOT_EQUAL: !=
9. GREATER_THAN_OPEN: >
10. LESS_THAN_OPEN: <
11. GREATER_THAN_CLOSED: >=
12. LESS_THAN_CLOSED: <=
13. AND: &&
14. OR: ||

## Built-in Internal Functions

### Math

| Function | Description |
|---|---|
| `abs(x)` | Absolute value of a number |
| `fixed(x, decimals)` | Rounds a number UP to the nearest integer |
| `floor(x)` | Rounds a number DOWN to the nearest integer |
| `pow(x, y)` | Calculate the exponent value of x raised to the power of y |
| `rand(min, max)` | Generate random integers |

### Time

| Function | Description |
|---|---|
| `sleep(ms)` | Sleep (time in ms) |
| `pnow()` | High resolution timestamp in milliseconds |

### Encoding

| Function | Description |
|---|---|
| `encode(data, format)` | Encode data (e.g. base64) |
| `decode(data, format)` | Decode data (e.g. base64) |

### Network

| Function | Description |
|---|---|
| `fetch(url, options)` | HTTP requests |

## Standard Library (Array Helpers)

Available via built-in TraSH array functions: `arr_clone`, `arr_append`, `arr_prepend`, `arr_reduce`, and others.
