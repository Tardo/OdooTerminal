# Testing

## Integration Tests

Integration tests use [Puppeteer](https://pptr.dev/) to drive a real browser against a running Odoo instance.

### Installation

```sh
apt-get install nodejs npm
npm install --global pnpm
pnpm install
npx puppeteer browsers install chrome
```

### Usage

```sh
export ODOO_VERSION=18.0
export PUPPETEER_BROWSER=chrome
pnpm run test
```

> Available browsers: `chromium`, `chrome`
>
> Available Odoo versions: `11.0`, `12.0`, `13.0`, `14.0`, `15.0`, `16.0`, `17.0`, `18.0`, `19.0`

Firefox is not currently supported by Puppeteer for extension testing.

## Unit Tests

Unit tests run inside the browser against a loaded Odoo page. Open the browser console and dispatch one of the
following events on the terminal element:

**Run all tests:**

```js
document.querySelector(".o_terminal").dispatchEvent(new Event('start_terminal_tests'))
```

**Run selected tests:**

```js
document.querySelector(".o_terminal").dispatchEvent(
  new CustomEvent('start_terminal_tests', {detail: 'test_whoami,test_search'})
)
```

## Untested Commands

The following commands do not yet have automated test coverage:

- `clear`
- `copy`
- `debug`
- `exportfile`
- `jstest`
- `lang`
- `login`
- `logout`
- `paste`
- `post`
- `reload`
- `tour` (partial)
