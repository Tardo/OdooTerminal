## Integration Tests

#### Installation

_For environments without a real X11 server see 'xvfb' (X11 Virtual
FrameBuffer)_

Test env. uses 'docker compose v2'!

```
apt-get install python poetry npm
npm install --global npm
npm install --global rollup
poetry install
npm install
```

#### Usage

```
npm run create:dev
npm run tests -- --browser chromium --odoo-version 16
```

\*\* Available browsers: firefox, chromium, chrome

\*\* Avaiblable versions: 11, 12, 13, 14, 15, 16

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
