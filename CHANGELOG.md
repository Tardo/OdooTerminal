# Changelog

**6.2.0**

```
IMP: New parameter modifier 'l': Allow input list of values (a list is a string of values separted by commas. Example: "1, 3, 5") (issue #19)
  - Command 'unlink': Now supports passing it a list of ids
  - Command 'write': Now supports passing it a list of ids
  - Command 'read': Now supports passing it a list of ids
IMP: Disable auto-hide in "fullscreen" mode
IMP: Reorganize project docs

ADD: Command 'exportvar': Export command result to a browser console variable
```

**6.1.0**

```
IMP: Commands 'print' & 'alias': New command definition attribute 'sanitized' to don't truncate the single quotes
IMP: Command 'search': Added the 'order' parameter and better description
IMP: Handle keyboard 'Escape' key to hide the terminal

FIX: Command 'longpolling': Don't break extension execution if 'bus' module hasn't been installed (issue #18)
FIX: Command 'lastseen': Don't run if 'bus' module hasn't been installed
FIX: Command 'ual': Now works on all supported Odoo versions
FIX: Command 'depends': Now works well if the module is not installed
```

**6.0.0**

```
IMP: Chromium based browsers action icon
IMP: Terminal CSS
IMP: Minor changes
IMP: User input
IMP: Command 'settings': Now can select the target module
IMP: Command 'tour': Removed the "oper" parameter
IMP: Command 'search': Added the 'offset' parameter

ADD: Command 'alias': Make your own command aliases
ADD: Command 'quit': Hide the terminal

FIX: async/await: Use a workaround to not break inheritance chain

DEL: Deprecated code
```

**5.3.1**

```
FIX: Click view record shortcut (issue #13) [fix 5.3.0 broken]
```

**5.3.0**

```
UPD: Renamed 'searchid' command to 'read' (Now 'searchid' is deprecated)

IMP: Aliases for terminal commands
IMP: Command Parser 'args' simplified
IMP: Code refactor
IMP: Tests
IMP: Command 'tour': Removed operation parameter (list, run)

ADD: Command 'depends': Know modules that depends on the given module
ADD: Command 'context_term': 'read', 'write' or 'set' terminal context (issue #14)
ADD: Command 'ual': Update apps list
ADD: Command 'logout': Session log out

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
