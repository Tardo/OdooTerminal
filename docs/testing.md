## Integration Tests

This tests only checks that the extension is loaded successfully on all
compatible Odoo versions.

#### Installation

_For environments without a real X11 server see 'xvfb' (X11 Virtual
FrameBuffer)_

Test env. uses 'docker compose v2'!

```
apt-get install python poetry
poetry install
```

#### Usage

```
poetry run pytest --browser chromium --odoo-version 15
```

** Available browsers: firefox, chromium, chrome ** Avaiblable versions: 11, 12,
13, 14, 15

## Unit Tests

**All**:
`document.querySelector(".o_terminal").dispatchEvent(new Event('start_terminal_tests'))`

**Selected (Example: whoami and search)**
`document.querySelector(".o_terminal").dispatchEvent(new CustomEvent('start_terminal_tests', {detail:'test_whoami,test_search'}))`

#### Untested Commands

- clear
- exportfile
- reload
- debug
- post
- jstest
- tour (partial)
- logout
- lang
- login
- barcode
