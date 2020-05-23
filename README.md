[![Build Status](https://travis-ci.com/Tardo/OdooTerminal.svg?branch=master)](https://travis-ci.com/Tardo/OdooTerminal)

![Mozilla Add-on](https://img.shields.io/amo/v/odoo-terminal?style=for-the-badge)
![Mozilla Add-on](https://img.shields.io/amo/users/odoo-terminal?style=for-the-badge)
![Mozilla Add-on](https://img.shields.io/amo/dw/odoo-terminal?style=for-the-badge)

# Odoo Terminal - WebExtension

_All the power of Odoo json-rpc in a really easy way!_

This web extension adds a terminal-like to control Odoo (11, 12, 13 & 14).

Compatible with Firefox and Chromium but only available in the
[Firefox Store](https://addons.mozilla.org/es/firefox/addon/odoo-terminal/).

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
| Search all fields of selected 'res.partner' record  | `searchid res.partner 5 *`                         |
| View 'res.partner' records _(only backend)_         | `view res.partner`                                 |
| View selected 'res.partner' record _(only backend)_ | `view res.partner 4`                               |
| Install module                                      | `install mymodule`                                 |

> Notice the usage of quotes when use parameters with spaces.

## Notes

- This extension have a "preferences" page where you can add commands to run on
  every session. This is useful for example to load a remote script to extend
  the 'terminal' features.
- This extension uses an internal context to extend the 'user context'. This
  'terminal context' has by default the key 'active_test' = false (see issue #14
  to get more information). This context only affects to terminal operations.

---

# Extension Permissions

| Permission | Reason                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| activeTab  | Enables support to get information about browser tabs                       |
| storage    | Enables support to manage stored data in the browser (used for preferences) |

---

# Contributing

## Pre-commit

If you want collaborate, you need this to make travis happy.

#### Installation

`pre-commit` command need be run inside of the project folder.

```
pip install pre-commit
pre-commit install -f
```

#### Usage

After install, when you do a commit all linters, prettiers, etc.. will run
automatically ;)

But, if you want you can run it manually:

```
pre-commit run -a
```

If one step fails the commit will be cancelled, try do it again (surely
pre-commit was changed some files, no problem, it's his job, add them again).
The only step thats require manual action if fails (very rare to happen) is the
last ('web-ext').

---

## Testing

This tests only checks that the extension is loaded successfully on all
compatible Odoo versions.

#### Installation

_For environments without a real X11 server see 'xvfb' (X11 Virtual
FrameBuffer)_

- **Common**

```
apt-get install python python-pip
pip install selenium
```

- Chromium

```
apt-get install chromium-browser chromium-chromedriver
```

- Chrome

\*\* Install chrome browser in your system: https://www.google.com/chrome/

```
apt-get install chromium-chromedriver
```

- Firefox (Not used already!)

```
apt-get install firefox geckodriver
```

#### Usage

```
python -m tests tests/test_chrome.py
```

---

# Changelog

**5.3.0**

```
UPD: Renamed 'searchid' command to 'read' (Now 'searchid' is deprecated)

IMP: Aliases for terminal commands
IMP: Command Parser 'args' simplified
IMP: Code refactor

ADD: Command 'depends': Know modules that depends on the given module
ADD: Command 'term_context': 'read', 'write' or 'set' terminal context (issue #14)

FIX: Extension Preferences
FIX: Click view record shortcut (issue #13)
```

**5.2.0**

```
IMP: Refactor code (TemplateManager)
IMP: User input
IMP: Command 'caf': Don't print undefined/null value

ADD: Command 'json': Sends POST application/json requests

FIX: Store wrong inputs again!
```

**5.1.0**

```
IMP: Added some sugar (async/await usage)
IMP: ParameterReader
IMP: Performance

FIX: Only consider the major version part to check the compatibility
```

**5.0.0**

```
IMP: Safer loaders
IMP: Print Array
IMP: Command 'longpolling': Rewrite implementation
IMP: Refactor Code (Methods names, Compat, Spread Operator)
IMP: Command 'whoami': Show res.user info
IMP: Command 'call': Add KWARGS argument (pr #9)
IMP: Maximize button: Save value in session storage

FIX: Terminal command 'jstest' doesn't works in portal (frontend)
FIX: Print error information
```

**4.0.0**

```
IMP: Selenium tests
IMP: Catch errors
IMP: Code refactor

ADD: Command 'login': Login as selected user
ADD: Command 'uhg': Check if user is in the selected groups
ADD: Command 'dblist': List database names
ADD: Command 'jstest': Launch JS Tests
ADD: Command 'tour': Launch Tour

FIX: Odoo mode detection

DEL: metadata command (redundant with Odoo DebugManager + not fully functional + adds more complexity for only one command)
```

**3.1.0**

```
IMP: Odoo mode detection
IMP: Pre-commit (web-ext)

ADD: Basic Selenium tests
```

**3.0.1**

```
FIX: tools/release.py
```

**3.0.0**

```
IMP: Compatibility load process
IMP: Terminal CSS
IMP: Command 'version': Now works on backend & frontend
IMP: User input: fish-like command preview feature
IMP: Minor improvements

ADD: Command 'context': 'read', 'write' or 'set' user context
ADD: Command 'longpolling': Print notifications
ADD: Pre-commit following OCA standards
ADD: Basic Travis CI configuration

FIX: Minor fixes (strings format, etc...)
```

**2.3.1**

```
FIX: Odoo version detection
```

**2.3.0**

```
IMP: Command 'settings': Moved to backend
IMP: Print Objects
IMP: Print Errors
IMP: Input management

ADD: Support to Odoo 14.0 (pr #7)
ADD: Command 'searchid': Works like 'search' but for a specific record id
```

**2.2.0**

```
IMP: Command 'search': Now 'fields' parameter its optional (default value is 'display_name') (issue #4)
IMP: Command 'whoami': Now shows more information (issue #5)
IMP: Now can copy content from terminal to the clipboard (issue #6)
IMP: Terminal CSS

ADD: Command 'lastseen': Show users 'last seen'

FIX: Version number, due to a mistake versioning in the firefox store, the extension version is hard-increased to 2.2.0
```

**2.0.1**

```
IMP: Start the JSDoc usage

FIX: Error when clicking on apps button in OE11 (issue #1)
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
- Improve unittest (tests for commmands)
```

---

More info: [javascript.md](./docs/javascript.md)

---

# License

Copyright 2019-2020 Alexandre Díaz & contributors

AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

All content under 'icons/' has its own licenses and original authors.
