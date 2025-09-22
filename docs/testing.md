## Integration Tests

#### Installation

```
apt-get install npm
npm install --global npm
npm install
npx puppeteer browsers install chrome
```

#### Usage

```
export ODOO_VERSION=18.0
export PUPPETEER_BROWSER=chrome
npm run test
```

\*\* Available browsers: chromium, chrome (Maybe, someday it will be possible to install the extension in firefox using
puppeteer)

\*\* Avaiblable versions: 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0

## Unit Tests

**All**: `document.querySelector(".o_terminal").dispatchEvent(new Event('start_terminal_tests'))`

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
- copy
- paste
