![Mozilla Add-on](https://img.shields.io/amo/v/odoo-terminal?style=for-the-badge)  ![Mozilla Add-on](https://img.shields.io/amo/users/odoo-terminal?style=for-the-badge) ![Mozilla Add-on](https://img.shields.io/amo/dw/odoo-terminal?style=for-the-badge)

# Odoo Terminal - WebExtension
_All the power of Odoo json-rpc in a really easy way!_

This web extension adds a terminal-like to control Odoo (11, 12 & 13).

Compatible with Firefox and Chromium but only available in the [Firefox Store](https://addons.mozilla.org/es/firefox/addon/odoo-terminal/).

---

**This add-on is only for technical purposes, DO NOT use it on remote instances where you don't have authorization!! If you access or alter any data that does not belong to you, you are taking significant legal risks!**

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

**2.2.1**
```
IMP: Command 'settings': Moved to backend
IMP: Print Objects
IMP: Print Errors
```

**2.2.0**
```
IMP: Command 'search': Now 'fields' parameter its optional (default value is 'display_name') (#4)
IMP: Command 'whoami': Now shows more information (#5)
IMP: Now can copy content from terminal to the clipboard (#6)
IMP: Terminal CSS

ADD: Command 'lastseen': Show users 'last seen'

FIX: Version number, due to a mistake versioning in the firefox store, the extension version is hard-increased to 2.2.0
```

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
- Create a script for make new releases automatically
- Copy fish feature to preview last matched command
```

---

More info: [javascript.md](./docs/javascript.md)

---

# License

Copyright 2019-2020 Alexandre Díaz

AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

All content under 'icons/' has its own licenses and original authors.
