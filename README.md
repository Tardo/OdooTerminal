[![Build Status](https://travis-ci.com/Tardo/OdooTerminal.svg?branch=master)](https://travis-ci.com/Tardo/OdooTerminal)
![Odoo Ver](https://img.shields.io/badge/Odoo-11.0-yellowgreen)
![Odoo Ver](https://img.shields.io/badge/Odoo-12.0-green)
![Odoo Ver](https://img.shields.io/badge/Odoo-13.0-green)
![Odoo Ver](https://img.shields.io/badge/Odoo-14.0-green)

![Mozilla Add-on](https://img.shields.io/amo/v/odoo-terminal?style=for-the-badge)
![Mozilla Add-on](https://img.shields.io/amo/users/odoo-terminal?style=for-the-badge)
![Mozilla Add-on](https://img.shields.io/amo/dw/odoo-terminal?style=for-the-badge)

![Chrome Add-on](https://img.shields.io/chrome-web-store/v/fdidojpjkbpfplcdmeaaehnjfkgpbhad?style=for-the-badge)
![Chrome Add-on](https://img.shields.io/chrome-web-store/users/fdidojpjkbpfplcdmeaaehnjfkgpbhad?style=for-the-badge)

<h1 align="center">
  <img src="icons/terminal-48.png" />
  <div>Odoo Terminal - WebExtension</div>
</h1>

_All the power of Odoo json-rpc in a really easy way!_

This web extension adds a terminal-like to control Odoo (11, 12, 13 & 14).

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

| Description                                         | Terminal Command                                   |
| --------------------------------------------------- | -------------------------------------------------- |
| Create 'res.partner' record                         | `create res.partner "{'name': 'The One'}"`         |
| Search 'res.partner' records                        | `search res.partner name,email "[['id', '>', 5]]"` |
| Search all fields of selected 'res.partner' records | `search res.partner * "[['id', '>', 5]]"`          |
| Read all fields of selected 'res.partner' record    | `read res.partner 5 *`                             |
| Read all fields of various 'res.partner' records    | `read res.partner 5,15,8 *`                        |
| View 'res.partner' records _(only backend)_         | `view res.partner`                                 |
| View selected 'res.partner' record _(only backend)_ | `view res.partner 4`                               |
| Install module                                      | `install mymodule`                                 |
| Create alias                                        | `alias myalias print My name is $1`                |

> Notice the usage of quotes when use parameters with spaces.

> Notice that a list is an string of values separated by commas. Example: "5,
> 15, 8"

## Notes

- This extension have a "preferences" page where you can add commands to run on
  every session. This is useful for example to load a remote script to extend
  the 'terminal' features.
- This extension uses an internal context to extend the 'user context'. This
  'terminal context' has by default the key 'active_test' = false (see issue #14
  to get more information). This context only affects to terminal operations.

---

## Advance Usage

You can use "parameter generator" to create values.

| Generator  | Arguments | Description                                                           |
| ---------- | --------- | --------------------------------------------------------------------- |
| \$STR      | min,max   | Generates a random string with a length between the given min and max |
| \$INT      | min,max   | Generates a random int between the given min and max                  |
| \$DATE     | min,max   | Generates a random date between the given min and max                 |
| \$DATETIME | min,max   | Generates a random date time between the given min and max            |
| \$NOW      |           | Gets the current date                                                 |
| \$NOWTIME  |           | Gets the current date time                                            |

The anatomy of a generator is: `$type[min,max]`

For example:

- create a new record with a random string:
  `create res.partner "{'name': '$STR[4,30]'}"`
- print the current date time: `print $NOWTIME`

> Notice that 'date' min and max are the milliseconds since 1970/01/01

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

Copyright 2019-2020 Alexandre Díaz & contributors

AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

All content under 'icons/' has its own licenses and original authors.
