# DEFINE NEW COMMANDS

Commands uses promises

**Command definition**::

```
{
  definition: string,
  callback: function,
  detail: string,
  args: string,
  aliases: array,
  sanitized: boolean,
  generator: boolean,
  example: string,
}
```

- definition: Quick definition.
- callback: Callback function.
- detail: Command explained.
- args: Command Arguments
  - Array: [TYPE, [NAME_SHORT, NAME_LONG], REQUIRED, DESCRIPTION, DEFAULT_VALUE,
    STRICT_VALUES]"
    - The 'TYPE' can be:
      - String
      - Number
      - Dictionary
      - Flag
      - Any
      - List
- aliases: Used to set deprecated names of the module
- sanitized: Truncate single quotes (default is true)
- generators: Resolve input generators (default is true)
- example: Shows and example (command name not required)

**Basic Example**:

See Code: [example_funcs.js](./example_funcs.js)

> Note that all input params are strings or numbers. You may use `j` args to
> parse automatically or `JSON.parse` to transform strings if you need a usable
> Javascript object.
