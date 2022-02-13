![Mozilla Add-on](https://img.shields.io/amo/v/odoo-terminal?style=for-the-badge)
![Mozilla Add-on](https://img.shields.io/amo/users/odoo-terminal?style=for-the-badge)
![Mozilla Add-on](https://img.shields.io/amo/dw/odoo-terminal?style=for-the-badge)

![Chrome Add-on](https://img.shields.io/chrome-web-store/v/fdidojpjkbpfplcdmeaaehnjfkgpbhad?style=for-the-badge)
![Chrome Add-on](https://img.shields.io/chrome-web-store/users/fdidojpjkbpfplcdmeaaehnjfkgpbhad?style=for-the-badge)

<h1 align="center">
  <img src="icons/terminal-48.png" />
  <div>Odoo Terminal - WebExtension</div>
</h1>
<p align="center">
The BFG10k for Odoo developers
</p>
<p align="center">
All the power of Odoo json-rpc in a really easy way!
</p>

This web extension adds a terminal-like to control Odoo (11 to 15). All
implemented commands use the tools provided by the Odoo framework. An unwavering
policy when developing this extension is to not modify or alter in any way the
Odoo classes. This sometimes results in certain commands having
reduced/increased capabilities depending on the Odoo version.

The terminal is fully initialized when it is first opened after loading the
page. So the impact on page loading is minimal.

**Downloads**

[<img src="https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo-lg.3d9087ac44e8.png" width="64">](https://addons.mozilla.org/es/firefox/addon/odoo-terminal/)
[<img src="https://www.google.com/chrome/static/images/chrome-logo.svg" width="64">](https://chrome.google.com/webstore/detail/odoo-terminal/fdidojpjkbpfplcdmeaaehnjfkgpbhad)

---

# Usage

When you visit a Odoo website, the browser action icon of the extension turn to
enabled state. This indicates that the extension is ready to use in the current
page.

Few commands aren't available on the frontend, use command 'help' to know the
available commands.

You can toggle terminal using one of these options:

- Press CTRL + 1
- Use extension browser action icon

## Example Commands

| Description                                         | Terminal Command                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| Create 'res.partner' record                         | `create -m res.partner -v "{'name': 'Hipcut', 'street': 'Mystery street'}"` |
| Create 'res.partner' record (simple mode)           | `create -m res.partner -v "name=Hipcut street='Mystery street'"`            |
| Search 'res.partner' records                        | `search -m res.partner -f name,email -d "[['id', '>', 5]]"`                 |
| Search all fields of selected 'res.partner' records | `search -m res.partner -f * -d "[['id', '>', 5]]"`                          |
| Read all fields of selected 'res.partner' record    | `read -m res.partner -i 5 -f *`                                             |
| Read all fields of various 'res.partner' records    | `read -m res.partner -i 5,15,8 -f *`                                        |
| View 'res.partner' records _(only backend)_         | `view -m res.partner`                                                       |
| View selected 'res.partner' record _(only backend)_ | `view -m res.partner -i 4`                                                  |
| Install module                                      | `install -m mymodule`                                                       |
| Create alias                                        | `alias -n myalias -c "print My name is $1"`                                 |

> Notice the usage of quotes when use parameters with spaces.

> Notice that a list is an string of values separated by commas. Example: "5,
> 15, 8"

> Notice that can call commands without 'named arguments', for example:
> `create res.partner "name=Hipcut street='Mystery street'"` The rule is that
> 'unnamed arguments' fill values following the order of the command arguments
> definition. So mix 'unnamed' with 'named' arguments can be done as long as the
> order is maintained.

> Notice that can use "simple json" format instead of normal syntaxis. For
> example "{'keyA':'this is a value', 'keyB':42}" can be done in a simple way
> "keyA='this is a value' keyB=42"

## Notes

- This extension have a "preferences" page where you can add commands to run on
  every session. This is useful for example to load a remote script to extend
  the 'terminal' features or declare custom aliases.
- This extension uses an internal context to extend the 'user context'. This
  'terminal context' has by default the key 'active_test' = false (see issue #14
  to get more information). This context only affects to terminal operations.
- The maximum buffered screen lines is set to 750. So, you can't see more than
  749 records in the same query. This is necessary to avoid have a lot of
  nodes... One of the problems of use HTML elements to render the output :/

---

## Advance Usage

#### + Parameter Generators

You can use "parameter generator" to create values.

| Generator    | Arguments | Default   | Description                                                                   |
| ------------ | --------- | --------- | ----------------------------------------------------------------------------- |
| \$STR        | min,max   | max = min | Generates a random string with a length between the given min and max         |
| \$FLOAT      | min,max   | max = min | Generates a random float between the given min and max                        |
| \$INT        | min,max   | max = min | Generates a random int between the given min and max                          |
| \$INTSEQ     | min,max   | max = min | Generates a list of int's starting from min to max                            |
| \$INTITER    | min,step  | step = 1  | Generates a consecutive int starting from min (useful with 'repeat' command)  |
| \$DATE       | min,max   | max = min | Generates a random date between the given min and max                         |
| \$TZDATE     | min,max   | max = min | Generates a random date between the given min and max (time zone format)      |
| \$TIME       | min,max   | max = min | Generates a random time between the given min and max                         |
| \$TZTIME     | min,max   | max = min | Generates a random time between the given min and max (time zone format)      |
| \$DATETIME   | min,max   | max = min | Generates a random date time between the given min and max                    |
| \$TZDATETIME | min,max   | max = min | Generates a random date time between the given min and max (time zone format) |
| \$EMAIL      | min,max   | max = min | Generates a random email                                                      |
| \$URL        | min,max   | max = min | Generates a random url                                                        |
| \$NOWDATE    |           |           | Gets the current date                                                         |
| \$TZNOWDATE  |           |           | Gets the current date (time zone format)                                      |
| \$NOWTIME    |           |           | Gets the current time                                                         |
| \$TZNOWTIME  |           |           | Gets the current time (time zone format)                                      |
| \$NOW        |           |           | Gets the current date time                                                    |
| \$TZNOW      |           |           | Gets the current date time (time zone format)                                 |

The anatomy of a generator is: `$type[min,max]`, `$type[max]` or `$type`

For example:

- create a new record with a random string:
  `create -m res.partner -v name='$STR[4,30]'`
- print the current time: `print -m $NOWTIME`

> Notice that 'date' min and max are the milliseconds since 1970/01/01

#### + Positional replacements for aliases

You can define aliases to call commands with predefined values. This command can
use positional replacements.

The anatomy of a positional replacement is: `$num[default_value]` or `$num`

For example:

- First positional replacement (without default value = empty):
  `alias -n my_alias -c "print -m 'Hello, $1'"`
- Fist position replacement with default value 'world':
  `alias -n my_alias -c "print -m 'Hello, $1[world]'"`
- A somewhat more complex:
  `alias -n search_mod -c "search -m ir.module.module -f display_name -d '[[\"name\", \"=\", \"$1\"], [\"state\", \"=\", \"$2[installed]\"]]'"`

#### + Runners (subcommands)

You can execute "subcommands" to use the result in a new command call. The
syntax of runners looks like `=={command}`, `=={command}.key` or
`=={command}[index]`.

For example: `read -m res.users -i =={search -m res.users -f id}.id`

#### + Massive operations

Massive operations are possible using the command `repeat`. Print to screen is a
expensive task, consider use the `--slient` argument to increase the
performance.

Example:
`repeat -t 5000 -c "create -m res.partner -v 'name=\"$STR[12] (Test)\"'" --silent`

---

# Extension Permissions

| Permission | Reason                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| activeTab  | Enables support to get information about browser tabs                       |
| storage    | Enables support to manage stored data in the browser (used for preferences) |

---

# Contributing

- [contributing.md](./docs/contributing.md)

---

# Changelog

- [CHANGELOG.md](CHANGELOG.md)

---

# License

Copyright 2019-2021 Alexandre Díaz & contributors

AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

All content under 'icons/' has its own licenses and original authors.
