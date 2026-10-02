# TraSH

TraSH is the scripting language built into OdooTerminal. It avoids the use of `eval` (required to pass browser extension
store checks) while remaining more expressive than plain JSON.

TraSH is **not part of this repository**: it is maintained as external packages. For the language reference (variables,
functions, control flow, operators, internals) and the standard library functions, see their repositories:

| Package               | Description                                                           | Repository                              |
| --------------------- | --------------------------------------------------------------------- | --------------------------------------- |
| `@tardo/trash`        | Interpreter, VM and language core                                     | <https://github.com/Tardo/TraSH>        |
| `@tardo/trash-stdlib` | Standard library (array, dict, math, string, time, encoding, network) | <https://github.com/Tardo/TraSH-stdlib> |

## How OdooTerminal uses it

- Commands import types and helpers from `@tardo/trash/*` (e.g. `@tardo/trash/constants`, `@tardo/trash/interpreter`).
- `src/js/page/loader.mjs` registers the stdlib modules (`registerArr`, `registerDict`, `registerEnde`, `registerMath`,
  `registerNet`, `registerStr`, `registerTime`) and the Odoo/terminal commands in the VM.
- Commands are defined in `src/js/page/odoo/commands/` and `src/js/page/terminal/commands/` (see
  [Developing](./developing.md)).
- The AI agent prompt describing the language lives in `src/js/page/ai/prompts/trash.mjs`; update it when bumping the
  TraSH package versions.
