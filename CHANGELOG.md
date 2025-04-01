# Changelog

**11.9.0**

```
ADD: Command 'sysparam': Edit odoo config. parameters (by baptiste-n42 - pr #144)
ADD: Command 'renew_database': Edit database renewal values (by baptiste-n42 - pr #144)

IMP: Minor code refactor

FIX: Flow type for 'uniqueId'
```

**11.8.0**

```
ADD: options: Theming

FIX: exportfile xml: Include ids for records without reference
FIX: hex2rgb: Correctly handle hex values
FIX: Command Assistant: Colors (issue #142)
FIX: Recordset Table: Display the contents of fields of type Object (issue #143)
FIX: Recordset Table: Correct processing of binary type fields
FIX: 'get_content': Use own implementation
```

**11.7.2**

```
FIX: file2base64: Support large files
FIX: onInternalMessage: Don't fail on non-Odoo pages (#141)
```

**11.7.1**

```
FIX: Command 'view': Show selected record (issue #140)
```

**11.7.0**

```
IMP: Command 'exportfile': Add CSV format [RFC-4180] (issue #138)
IMP: Command 'exportfile': Add XML odoo format
IMP: Interpreter: Add unknown lexer type (issue $139)

FIX: Command 'search', 'read': --read-binary
FIX: Exception with longpolling on first loads
```

**11.6.0**

```
IMP: Support Odoo 18.0
IMP: Detect enterprise version

FIX: Paste clipboard content in the terminal input
FIX: Wrong version on docker instances (issue #136)
FIX: Unwanted exceptions when writing code
```

**11.5.2**

```
FIX: Press escape key without having the terminal fully initialized (issue #134)
```

**11.5.1**

```
IMP: Translations
IMP: Core resilience

UPD: Docs
```

**11.5.0**

```
IMP: showQuestion: show terminal
IMP: Don't resolve unknown values by default

ADD: TraSH: +=, -=, *=, /=

UPD: Samples

FIX: TraSH: Store SUBSCR

DEL: Command 'quit'
```

**11.4.0**

```
IMP: Internal Command 'fetch': Use AbortSignal.timeout
IMP: Command Assistant
IMP: Helpers: add $UID and $UNAME
IMP: Loader: Handle lazy load

ADD: Command 'info': Get generic information
ADD: Command 'notify': Show notifications
ADD: Command 'run': Run a TraSH script

UPD: Manifest strings
UPD: Docs

FIX: Extension options page
```

**11.3.0**

```
UPD: Docs
UPD: Samples

IMP: TraSH: functions
IMP: TraSH: if/else
IMP: Tests: Use Official Odoo Docker Image

ADD: TraSH: typed function paramaters
ADD: TraSH: elif
ADD: Terminal: Button to reload the shell
```

**11.2.0**

```
IMP: Minor refactor

ADD: Internal Command 'fetch': HTTP requests
ADD: Samples
```

**11.1.0**

```
IMP: Cache
IMP: Command assistant: multi-level help
IMP: Command 'help': show 'internal' commands

ADD: Internal Command 'pnow': high resolution timestamp
ADD: Command 'input': requests user input

FIX: TraSH Interpreter: Token position
```

**11.0.1**

```
FIX: Implicit strings (issue #133)
FIX: Command assistant
```

**11.0.0**

```
IMP: TraSH: Turing completeness
IMP: Use 'flow'
IMP: Use Manifest V3
IMP: jQuery is no longer used
IMP: python is no longer used

ADD: TrasH: Global names $RMOD and $RID (issue #131)
ADD: Multi-line input mode
ADD: Translations
ADD: Command 'sleep'

FIX: 'debug' command (issue #132)

DEL: Command 'repeat': It presented problems if more than one 'repeat' was executed at the same time.
```

**10.4.2**

```
IMP: Browse action icon badge (issue #129)
IMP: Enable Odoo >16.0 support for all (issue #130)
```

**10.4.1**

```
IMP: Tests messages

FIX: TraSH: Interpreter (issue #128)
FIX: User input: key up (prev. history)
```

**10.4.0**

```
IMP: Command assistant

ADD: Dynamic command argument options (issue #127)
```

**10.3.2**

```
FIX: rpc in master branch
FIX: Command 'post' in master branch
FIX: Command 'clear' (issue #126)
FIX: Error names in minified bundle
```

**10.3.1**

```
UPD: Add tests for 14.0 and 15.0
UPD: Project structure

FIX: Work on Odoo 14.0 (issue #125)
```

**10.3.0**

```
IMP: Command 'create': Now can create more than one record
IMP: Messages from/to 'extension private-shared' side
IMP: Command Assistant: Show descriptions
IMP: Docs: Developing

UPD: Drop python usage

FIX: Command 'gen': reset stores
FIX: Command Assistant
FIX: Input: History & Navigation

ADD: Command 'copy': Copy values to paste them into other instances
ADD: Command 'paste': Copy terminal values throught differente
```

**10.2.0**

```
IMP: More modules
IMP: Reduced loading time to ~24ms
IMP: Changed 'pre-commit' to 'husky' (no more problems with npm packages)

FIX: TraSH: Interpreter dictionaries
```

**10.1.1**

```
IMP: Command error message

FIX: Command 'gen' definition
FIX: Init Commands (issue #123)
FIX: Read command arguments
```

**10.1.0**

```
UPD: commands async/await
UPD: command 'longpolling'

FIX: utils
FIX: screen: printError
FIX: tools/release
FIX: tests
```

**10.0.0**

```
IMP: Refactor to ESM
IMP: Project structure
IMP: Underscore is no longer used
IMP: Support Odoo master version
IMP: Use rollup
IMP: Separate commands

UPD: Use own icons

FIX: Interpreter default arguments
FIX: Command 'ref' in Odoo >=15
FIX: Error report in Odoo >= 15
FIX: Minor bugfixes
FIX: Command 'read': wildcard with binary fields (issue #118)

ADD: 'Extension Developer Zone' in the extension settings
```

**9.3.1**

```
IMP: Start refactor to mjs

FIX: Toggle terminal keybind
```

**9.3.0**

```
IMP: Github workflow
IMP: Commands 'install' and 'upgrade': operate over more than one module
IMP: Don't use jsonrpc to get the server version

FIX: Math parser (now support negative numbers O_o!)

ADD: Command 'ws': websockets
ADD: Show the odoo version in the action icon
```

**9.2.2**

```
FIX: Set odoo >16.0 unsupported  (issue #99)
```

**9.2.1**

```
FIX: Avoid load in 'alpha', 'beta' versions (issue #99)
```

**9.2.0**

```
IMP: TraSH: Native math, parser and vmachine
IMP: TraSH: Blocks
IMP: Terminal: History navigation
IMP: Terminal: Command Assistant
IMP: Tests and minor changes
```

**9.1.1**

```
FIX: TraSH: runners
```

**9.1.0**

```
IMP: file utils operations

FIX: TraSH: 'inline' load runner result data attribute (issue #92)
FIX: Init. Commands (issue #88)

ADD: Command 'genfile': Generates a File object
ADD: Math operations
```

**9.0.0**

```
IMP: Runners
IMP: Args. definition
IMP: Command 'search': return a recordset
IMP: Command 'read': return a recordset
IMP: Command 'create': return a recordset

ADD: 'TraSH'
ADD: Command 'gen': Replacement for generators
ADD: Command 'now': Shows current time/date/datetime
ADD: Command 'commit': Write recordset changes
ADD: Comand: 'rollback': Undo recordset changes
ADD: Support Odoo 16.0

DEL: SimpleJSON
DEL: Generators
```

**8.6.0**

```
IMP: Options

FIX: Shortcut on firefox (issue #69)
```

**8.5.1**

```
IMP: Command 'search': better output

FIX: ParameterReader: quotes (issue #65)
FIX: ParameterReader: escaped sequences (issue #65)
FIX: ParameterReader: simpleJSON
```

**8.5.0**

```
IMP: Command 'whoami': Show groups and companies names
IMP: Command 'login': Add '--no-reload' argument
IMP: Toggle terminal keybind changed to ALT + T (CTRL + 1 is deprecated)
IMP: Tests
IMP: Support master

ADD: Interactive questions

FIX: Command 'create' in Odoo 11.0
FIX: Command 'whoami' in Odoo 11.0
FIX: Init commands (issue #63)
FIX: Terminal: now report correct required arguments
```

**8.4.0**

```
IMP: Screen: Use fewer css classes
IMP: Support last version of Odoo (master branch)

ADD: Command 'barcode': Simulate barcode scanning and info

FIX: Command 'lang': UtilsBackend is undefined (issue #55)
```

**8.3.1**

```
UPD: Remove github workflow

IMP: Longpolling print
IMP: Terminal style
IMP: Adapt to load in master branch

FIX: Get initial information (username and version): Now work correctly with public users
FIX: Command 'login' and 'logout': Reload page to get updated session information
FIX: Command 'print': Prevent print from being blocked
```

**8.3.0**

```
IMP: ParameterReader: Error messages (issue #41 #42)
IMP: '_searchSimiliarCommand': Trying to make it a little more precise

ADD: Integration test for 'rpc' and 'metadata'
ADD: Command 'parse_simple_json': Returns a JSON from simple format string

FIX: Command 'metadata': Show a more understandable error (issue #42) and moved from backend to common zone
FIX: Integration test for 'view'
FIX: '_simple2JSON': Detect simple format before try convert
FIX: Integration tests for v15.0+
```

**8.2.1**

```
FIX: _conv2JSON: Ignore native arrays
```

**8.2.0**

```
IMP: Changed subcommand template from {{subcommand}} to =={subcommand}: This is done to avoid collisions with jinja2 payloads
IMP: Support for Odoo 15.0: The command 'context' is not fully supported due to the reduced available services for the legacy environment.

ADD: Command 'rpc': Execute RPC with custom options
ADD: Command 'metadata': Show record metadata (issue #37)
ADD: Support for 'simple json' format (issue #38)

FIX: Disable native browser autocomplete
FIX: Command 'call': Escape output

```

**8.1.0**

```
IMP: Integration tests
IMP: Command 'post': New argument '--mode' to select the mode (odoo or raw, default is odoo)
IMP: Command 'dblist' New argument '--only-active' to print only the active database name
IMP: Screen: Pretty print array of objects and show the host in the prompt

ADD: Unit tests
ADD: RPC: Modified implementation to do rpc queries (issue #33)

FIX: Command 'load': Return native promise
FIX: Command 'context_term': Operation 'delete' and '--value' argument type changed to any
FIX: Command 'context': '--value' argument type changed to any
FIX: Command 'alias': Default operation
FIX: Command 'call': Use correct properties (issue #34)
FIX: Command 'longpolling': Don't print undefined value when do 'add_channel' operation
FIX: Command 'uhg': Send group names as string
FIX: Command 'lang': Moved to backend
FIX: ParameterReader: Argument definition not found in 'validateAndFormat'
FIX: ParameterReader: Correct detection of invalid arguments in subcommands
FIX: Screen: Open view on click id (issue #32)
FIX: CommandAssistant: Parameters with spaces and nav mode in 11.0
```

**8.0.0**

```
IMP: Screen: reflows
IMP: Parameter reader: support json parameter
IMP: Command 'caf': hightlight required fields and new argument to apply a filter
IMP: Command 'help': More verbose format
IMP: Command 'login': Now uses '#' instead of '-'
IMP: Command 'repeat': New argument '--silent'
IMP: Support with "master" branch (pre 15.0)
IMP: ParamaterReader: Now supports 'named arguments'
IMP: Command definition: Rework 'args' and removed unused properties (syntax)
IMP: Shadow input: preview: Show possible parameter

ADD: Command 'lang': Operations over translations (issue #30)
ADD: 'delete' option to 'context' and 'context_term' commands
ADD: Command Assistant

FIX: Disable 'native autocomplete' in chrome

DEL: Command 'mute'. Now is part of the execution implementation
```

**7.3.0**

```
ADD: Alias 'echo' for 'print' command
ADD: Support for 'runners' (subcommands)
```

**7.2.0**

```
IMP: Print to screen performance
IMP: Fuzz feature
IMP: Loops performance
IMP: Only start the terminal if needed
IMP: Shows an alert if try close the tab with running jobs

ADD: Help examples
ADD: Command 'fuzz_field': Fill fields on the active form
ADD: Command 'ref': Show the referenced model and id of the given xmlid's
ADD: Command 'jobs': Show running jobs

FIX: Command 'post': Send correct payload
FIX: Command 'mute': Don't mute other jobs
FIX: Command 'repeat': Don't block main thread
```

**7.1.0**

```
IMP: Command 'caf': Sorted by field name
IMP: Screen: Use less nodes
IMP: Screen: Auto vacuum (No more than 750 lines)
IMP: Command 'repeat': Try to be nice with the main thread
IMP: Command 'fuzz': Support one2many fields and other improvements
IMP: ParameterReader: Now can use slashes to avoid double quotes grouping (Example: "This \"is\" an example")
IMP: Handle big results: split current query to not block/crash the browser
IMP: Now can set default values for positional replacements (Example: $1[defaul text value] or $1[42])

ADD: Command 'mute': Runs the command only printing errors. (Useful with the 'repeat' command)
ADD: Command 'count': Get the number of records
ADD: Command 'exportfile': Exports the command result to a text file
ADD: New parameter generator: $FLOAT
ADD: Prompt changes the color per host (locahost doesn't have any color)

FIX: Changed some calls using the old 'print' call
FIX: Command 'caf': Now can use 'fields' parameter
FIX: Shadow Input: Correct sync. with input scroll left
```

**7.0.0**

```
IMP: Restructured project
IMP: Refactor source
IMP: Parameter generator: Now doesn't need set the 'max' value
IMP: Command 'view': Now can select a view ref
IMP: Commands 'search' and 'read': Doesn't delete the 'id' attribute

ADD: New parameter generators:
  - Generator '$INTSEQ'
  - Generator '$INTITER'
  - Generator '$TZDATE'
  - Generator '$TIME'
  - Generator '$TZTIME'
  - Generator '$TZDATETIME'
  - Generator '$NOWDATE'
  - Generator '$TZNOWDATE'
  - Generator '$TZNOWTIME'
  - Generator '$TZNOW'
  - Generator '$EMAIL'
  - Generator '$URL'
ADD: Command 'fuzz': Open the selected view of the model and try to create a new record with random values (This is the first basic attempt for this feature)

FIX: Behaviour of some parameter generators was changed:
  - Generator '$DATE'
  - Generator '$DATETIME'
  - Generator '$NOW'
```

**6.2.0**

```
IMP: New parameter modifier 'l': Allow input list of values (a list is a string of values separted by commas. Example: "1, 3, 5") (issue #19)
  - Command 'unlink': Now supports passing it a list of ids
  - Command 'write': Now supports passing it a list of ids
  - Command 'read': Now supports passing it a list of ids
IMP: Disable auto-hide in "fullscreen" mode
IMP: Reorganize project docs

ADD: Command 'exportvar': Export command result to a browser console variable
ADD: Command 'chrono': Print the time expended executing a command
ADD: Command 'repeat': Repeat a command N times
ADD: 'ParameterGenerator' component: Generate values for terminal command parameters
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
