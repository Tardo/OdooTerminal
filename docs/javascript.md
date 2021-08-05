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

Commands uses promises

**Command definition**::

```
{
  definition: string,
  callback: function,
  detail: string,
  syntax: string,
  args: string,
  secured: boolean,
  aliases: array,
  sanitized: boolean,
}
```

- definition: Quick definition.
- callback: Callback function.
- detail: Command explained.
- syntax: Command Parameters (For Humans)
  - <> Required
  - [] Optional
- args: Command Paramerters Types
  - 's' String
  - 'i' Number
  - 'j' String. Using JSON.parse
  - '?' Indicates that next parameters are optional
  - '\*' All the rest (unknown) of params are formatted as string
  - 'l' Indicates that the next parameter can be a list (a list is a string of
    values separted by commas. Example: "1, 3, 5")
  - '-' Avoid check type, the param are formatted as string
- secured: Hide command from screen & history (default is false)
- aliases: Used to set deprecated names of the module
- sanitized: Truncate single quotes (default is true)

**Basic Example**::

See Code: [example_funcs.js](./example_funcs.js)

> Note that all input params are strings or numbers. You may use `j` args to
> parse automatically or `JSON.parse` to transform strings if you need a usable
> Javascript object.
