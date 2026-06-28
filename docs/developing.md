# Developing

## Installation

Required system tools:

```sh
apt-get install nodejs npm
npm install --global pnpm
```

Project dependencies (also sets up Husky hooks):

```sh
pnpm install
```

## Building

Start the watch mode to rebuild the extension automatically as files change:

```sh
pnpm run dev:rollup:watch
```

## Available Scripts

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

## Loading the Extension

### Manual (unpacked)

**Chromium / Chrome:**

1. Go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/` folder.
4. Open a new tab and verify the extension loads correctly.

**Firefox:**

1. Open `about:debugging`.
2. Click **This Firefox**.
3. Click **Load Temporary Add-on** and select any file inside the `dist/` folder.

### Using web-ext (recommended for development)

```sh
pnpm run start:chromium   # launch Chromium with the extension loaded
pnpm run start:chrome     # launch Chrome with the extension loaded
pnpm run start:firefox    # launch Firefox with the extension loaded
```
