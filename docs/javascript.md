# PUBLIC METHODS

| Command                        | Description             |
| ------------------------------ | ----------------------- |
| `print(str, bool, str)`        | Print a message         |
| `eprint(str)`                  | Print a escaped message |
| `printTable(array, str)`       | Print a table           |
| `clean()`                      | Clean terminal          |
| `cleanInput()`                 | Clean input             |
| `registerCommand(str, cmdDef)` | Register new command    |
| `executeCommand(str)`          | Execute a command       |
| `do_show()`                    | Show terminal           |
| `do_hide()`                    | Hide terminal           |
| `do_toggle()`                  | Toggle visibility       |

# DEFINE NEW COMMANDS

Commands works with promises

**Command definition**::

```
{
  definition: string,
  callback: function,
  detail: string,
  syntaxis: string,
  args: string,
  secured: boolean,
  aliases: array,
}
```

- definition: Quick definition.
- callback: Callback function.
- detail: Command explained.
- syntaxis: Command Parameters (For Humans)
  - <> Required
  - [] Optional
- args: Command Paramerters Types
  - 's' String
  - 'i' Integer
  - '?' Indicates that next parameter is optional
- secured: Hide command from screen & history
- aliases: Used to given deprecated names of the module

**Basic Example**::

See Code: [example_funcs.js](./example_funcs.js)

> Note that all input params are strings or integers. You may use `JSON.parse`
> to transform strings if you need a usable Javascript object.
