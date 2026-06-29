# Roadmap

Planned improvements and known limitations:

- Resolve Bootstrap version conflicts that cause display issues in Odoo 11.0 (the terminal uses Bootstrap 4 while
  Odoo 11.0 ships Bootstrap 3).
- Remove extension storage data when the extension is uninstalled (Chrome does not expose an uninstall event for
  this purpose).
- Introduce mock support to enable automated testing of the remaining untested commands (see the
  [Untested Commands](docs/testing.md#untested-commands) section).
- Formalise the terminal state machine by explicitly defining all states and transitions.
- Upload Screenshots in AI mode
