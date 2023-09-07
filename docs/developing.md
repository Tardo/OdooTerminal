## Developing

### Installation

- Required system tools:
  ```
  apt-get install npm
  npm install --global npm
  ```
- Project Dependencies:
  ```
  npm install
  ```
  \*\* This will also prepare the project

### Usage

Initialize development tools... This will build the extension as the code is
modified:

```
npm run dev:watch
```

### Load Extension

#### Using Custom Environment

- Chromium/Chrome:
  1. Go to `chrome://extensions/`.
  2. At the top right, turn on `Developer mode`.
  3. Click `Load unpacked`.
  4. Find and select the app or extension folder.
  5. Open a new tab in Chrome > click `Apps` > click the app or extension. Make
     sure it loads and works correctly.
- Firefox:
  1. Open the `about:debugging` page
  2. Click the `This Firefox` option
  3. click the `Load Temporary Add-on` button, then select any file in the
     extension directory.

#### Using Web-Ext Environment

- Chromium:
  ```sh
  npm run start:chromium
  ```
- Chrome:
  ```sh
  npm run start:chrome
  ```
- Firefox:
  ```sh
  npm run start:firefox
  ```
