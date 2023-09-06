# TraSH

TraSH is the pseudo-language used in the Terminal. It is necessary to circumvent
the use of 'eval' (necessary to pass the extension store checks) and not have
the limitations of JSON. This is my own implementation simply because I felt
like doing something like this... but maybe it's not the best of my ideas... at
least it seems to work and meet expectations.

## Components

- Interpreter: Compile input string into pseudo-bytecode
- VMachine: Runs the pseudo-bytecode

## All its async! (but no...)

Each executed piece of code is handled asynchronously. Each call to a 'command'
in a piece of code is handled synchronously.

For example:

- A) Commands are executed synchronously:

  `search res.partner; search res.company`

- B) Commands are executed asynchronously:

  `search res.partner`

  `search res.company`
