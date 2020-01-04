![Mozilla Add-on](https://img.shields.io/amo/v/odoo-terminal?style=for-the-badge)  ![Mozilla Add-on](https://img.shields.io/amo/users/odoo-terminal?style=for-the-badge) ![Mozilla Add-on](https://img.shields.io/amo/dw/odoo-terminal?style=for-the-badge)

# Odoo Terminal - WebExtension
_All the power of Odoo json-rpc in a really easy way!_

This web extension adds a terminal-like to control Odoo (11, 12 & 13).

Compatible with Firefox and Chromium but only available in the [Firefox Store](https://addons.mozilla.org/es/firefox/addon/odoo-terminal/).

---

# Usage

When you visit a Odoo website, the browser action icon of the extension turn to enabled state. This indicates that the extension is ready to use in the current page.

Few commands aren't available on the frontend, use command 'help' to know the available commands.

You can toggle terminal using one of these options:
* Press CTRL + 1
* Use extension browser action icon

# Example Commands

| Description | Terminal Command |
| ----------- | ---------------- |
| Create 'res.partner' record | `create res.partner "{'name': 'The One'}"` |
| Search 'res.partner' records | `search res.partner name,email "[['id', '>', 5]]"` |
| Search all fields of selected 'res.partner' records | `search res.partner * "[['id', '>', 5]]"` |
| View 'res.partner' records | `view res.partner` |
| View selected 'res.partner' record | `view res.partner 4` |
| Install module | `install mymodule` |

> Note the usage of quotes when use parameter with spaces.

---

# Extension Permissions

| Permission | Reason |
| ---------- | ------ |
| activeTab | Enables support to get information about browser tabs |
| storage | Enables support to manage stored data in the browser (used for preferences) |

---

# Changelog

**2.0.1**
```
IMP: Start the JSDoc usage

FIX: Error when clicking on apps button in OE11 (#1)
FIX: Toggle maximize
```

**2.0.0**
```
IMP: Code refactor
IMP: Now works on frontend

ADD: Option to maximize the terminal
ADD: Command 'cam': Show access rights on the selected model
ADD: Command 'caf': Show readable/writeable fields of the selected model
ADD: Command 'version': Show Odoo version (Only backend)
ADD: Command 'whoami': Show login of the active user
ADD: Command 'load': Load external resource (javascript & css)
ADD: Preferences page (Add-ons > OdooTerminal > Preferences)

FIX: Terminal command 'metadata' crash on discuss in Odoo 11
FIX: '_searchSimiliarCommand' accuracy
FIX: Terminal command 'call' doesn't print results properly
```

**1.0.1**
```
FIX: Storage compatibility with Odoo 11
```

**1.0.0**
```
Big Bang!
```

---

# Roadmap

```
- Add unittest. Easy? Need mock 99%?
```

---

More info: [javascript.md](./docs/javascript.md)

---

# License

Copyright 2019-2020 Alexandre Díaz

AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

All content under 'icons/' has its own licenses and original authors.
