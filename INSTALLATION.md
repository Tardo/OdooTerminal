# Installing and Updating OdooTerminal Extension

This guide explains how to install and update the OdooTerminal browser extension, including loading development versions with new features like the `clearcache` command.

## Table of Contents
- [Installing from Official Sources](#installing-from-official-sources)
- [Installing Development Version](#installing-development-version)
- [Updating to Latest Development Version](#updating-to-latest-development-version)
- [Verifying the Update](#verifying-the-update)

---

## Installing from Official Sources

### Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/odoo-terminal/fdidojpjkbpfplcdmeaaehnjfkgpbhad)
2. Click **"Add to Chrome"**
3. Confirm the installation

### Firefox Add-ons
1. Visit [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/odoo-terminal/)
2. Click **"Add to Firefox"**
3. Confirm the installation

### Microsoft Edge Add-ons
1. Visit [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/odooterminal/fhndkkdikhceeojdacifnlmaeoklbogg)
2. Click **"Get"**
3. Confirm the installation

> **Note:** Official store versions are updated when new releases are published. For the latest development features (like the new `clearcache` command), follow the development installation instructions below.

---

## Installing Development Version

To use the latest development version with new features before they're officially released:

### Prerequisites
1. **Install Node.js and npm** (if not already installed)
   ```bash
   # Verify installation
   node --version
   npm --version
   ```

2. **Clone the repository**
   ```bash
   git clone https://github.com/killday/OdooTerminal.git
   cd OdooTerminal
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

### Build the Extension

Build the extension for production:
```bash
npm run prod:build
```

Or for development with live reload:
```bash
npm run dev:rollup:watch
```

> The build process creates a `dist` folder with the compiled extension files.

### Load Unpacked Extension in Chrome/Chromium

1. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/`
   - Or use menu: **⋮** → **More Tools** → **Extensions**

2. **Enable Developer Mode**
   - Toggle the **"Developer mode"** switch in the top-right corner

3. **Load the extension**
   - Click **"Load unpacked"** button
   - Navigate to the OdooTerminal repository folder
   - Select the **root folder** (the one containing `manifest.json` and `dist` folder)
   - Click **"Select Folder"**

4. **Verify installation**
   - The OdooTerminal extension should now appear in your extensions list
   - Make sure it's enabled (toggle should be on/blue)

### Load Temporary Add-on in Firefox

1. **Open Firefox Add-ons page**
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Or use menu: **☰** → **More Tools** → **Add-ons and themes** → click the gear icon → **Debug Add-ons**

2. **Load temporary add-on**
   - Click **"This Firefox"** in the sidebar
   - Click **"Load Temporary Add-on..."** button
   - Navigate to the OdooTerminal repository folder
   - Select the `manifest.json` file
   - Click **"Open"**

3. **Verify installation**
   - The extension should appear in the temporary extensions list

---

## Updating to Latest Development Version

When new features are added (like the `clearcache` command), follow these steps to update:

### Method 1: Pull Latest Changes and Rebuild

1. **Navigate to your local repository**
   ```bash
   cd /path/to/OdooTerminal
   ```

2. **Pull the latest changes from GitHub**
   ```bash
   git fetch origin
   git pull origin main  # or the branch you're using
   ```

   Or if you're following a specific branch (like `claude/clear-cache-odoo-18`):
   ```bash
   git fetch origin
   git checkout claude/clear-cache-odoo-18
   git pull origin claude/clear-cache-odoo-18
   ```

3. **Rebuild the extension**
   ```bash
   npm run prod:build
   ```

4. **Reload the extension**

   **For Chrome:**
   - Go to `chrome://extensions/`
   - Find OdooTerminal
   - Click the **🔄 reload icon** (circular arrow)

   **For Firefox:**
   - Go to `about:debugging#/runtime/this-firefox`
   - Find OdooTerminal
   - Click **"Reload"** button

   > **Note:** You don't need to remove and re-add the extension. The reload button will pick up all changes.

### Method 2: Automatic Rebuild (Development)

If you're actively developing or testing:

1. **Start the watch mode**
   ```bash
   npm run dev:rollup:watch
   ```

   This will automatically rebuild the extension when source files change.

2. **After changes are detected and rebuilt**
   - Reload the extension using the reload button (see Method 1, step 4)
   - Or in Chrome, you can also reload by pressing `Ctrl+R` on the extensions page

---

## Verifying the Update

After updating, verify that the new `clearcache` command is available:

1. **Open any Odoo website** (development, staging, or production)

2. **Open OdooTerminal**
   - Press `Ctrl + ,` (default shortcut)
   - Or click the OdooTerminal extension icon

3. **Test the clearcache command**
   ```bash
   clearcache
   ```

   You should see output similar to:
   ```
   Cache cleared successfully
   The following caches have been cleared:
     - Search/Read cache
     - Service call cache
     - Model multi-call cache
   ```

4. **Check command help**
   ```bash
   help clearcache
   ```

   This should display the command documentation.

5. **Verify extension version** (optional)
   - Go to `chrome://extensions/` or `about:addons`
   - Check the version number (development versions may show the version from `manifest.json`)

---

## Troubleshooting

### Extension Doesn't Update After Rebuild

**Problem:** Changes don't appear after rebuilding and reloading.

**Solutions:**
1. **Hard reload:**
   - Remove the extension completely
   - Restart the browser
   - Re-add the extension using "Load unpacked"

2. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Clear cached images and files
   - Restart browser

3. **Check build output:**
   - Verify the `dist` folder was regenerated
   - Check timestamps on `dist/pub/loader.mjs`
   - Look for build errors in the terminal

### Command Not Found

**Problem:** `clearcache` command shows "command not found" error.

**Solutions:**
1. **Verify build completed:**
   ```bash
   grep -r "clearcache" dist/pub/loader.mjs
   ```
   Should show the command registration.

2. **Check you're on the right branch:**
   ```bash
   git branch
   git log --oneline -5
   ```

3. **Rebuild from scratch:**
   ```bash
   npm run clean
   npm run prod:build
   ```

### Build Errors

**Problem:** Build fails with errors.

**Solutions:**
1. **Update dependencies:**
   ```bash
   npm install
   ```

2. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   ```
   Ensure you have Node.js 14+ installed.

---

## Using Web-Ext (Alternative Method)

For a more automated development experience, you can use web-ext:

### Chrome
```bash
npm run start:chrome
```

### Chromium
```bash
npm run start:chromium
```

### Firefox
```bash
npm run start:firefox
```

These commands will:
1. Build the extension
2. Launch the browser with the extension pre-loaded
3. Auto-reload on changes (when combined with watch mode)

---

## Additional Resources

- [Development Guide](./docs/developing.md) - Full development setup
- [Contributing Guide](./docs/contributing.md) - How to contribute
- [Testing Guide](./docs/testing.md) - Running tests
- [Admin Documentation](./ADMIN_DOCUMENTATION.md) - All available commands
- [GitHub Repository](https://github.com/killday/OdooTerminal)

---

## Need Help?

If you encounter issues:
1. Check the [GitHub Issues](https://github.com/killday/OdooTerminal/issues)
2. Create a new issue with:
   - Your browser version
   - OdooTerminal version/branch
   - Build output or error messages
   - Steps to reproduce the problem
