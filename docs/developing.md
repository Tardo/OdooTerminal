## Developing

### Installation

- Required system tools:
  ```
  apt-get install nodejs npm
  npm install --global pnpm
  ```
- Project Dependencies:
  ```
  pnpm install
  ```
  \*\* This will also prepare the project (husky hooks, etc.)

### Usage

Initialize development tools... This will build the extension as the code is modified:

```
pnpm run dev:rollup:watch
```

### Available Scripts

| Script | Description |
|---|---|
| `pnpm run dev:rollup` | Build extension (development mode) |
| `pnpm run dev:rollup:watch` | Build and watch for changes |
| `pnpm run dev:eslint` | Run ESLint |
| `pnpm run dev:flowcheck` | Run Flow type checker |
| `pnpm run dev:flow-typed` | Install/update Flow type stubs for dependencies |
| `pnpm run dev:web-ext` | Lint extension with web-ext |
| `pnpm run prod:build` | Build extension (production mode) |
| `pnpm run test` | Run integration tests |
| `pnpm run release` | Create a release |

### Load Extension

#### Using Custom Environment

- Chromium/Chrome:
  1. Go to `chrome://extensions/`.
  2. At the top right, turn on `Developer mode`.
  3. Click `Load unpacked`.
  4. Find and select the app or extension folder.
  5. Open a new tab in Chrome > click `Apps` > click the app or extension. Make sure it loads and works correctly.
- Firefox:
  1. Open the `about:debugging` page
  2. Click the `This Firefox` option
  3. click the `Load Temporary Add-on` button, then select any file in the extension directory.

#### Using Web-Ext Environment

- Chromium:
  ```sh
  pnpm run start:chromium
  ```
- Chrome:
  ```sh
  pnpm run start:chrome
  ```
- Firefox:
  ```sh
  pnpm run start:firefox
  ```
