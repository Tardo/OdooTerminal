# Installing and Updating OdooTerminal Extension

This guide explains how to install and update the OdooTerminal browser extension, including loading development versions with new features like the `clearcache` command.

## Table of Contents
- [Installing from Official Sources](#installing-from-official-sources)
- [Installing Development Version](#installing-development-version)
  - [Windows 11 Setup Guide](#windows-11-setup-guide)
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
   - Node.js version 18 or higher is required
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

---

### Windows 11 Setup Guide

If you're using Windows 11, follow these platform-specific instructions for a smooth development setup.

#### Installing Git for Windows

1. **Download Git for Windows**
   - Visit [https://git-scm.com/download/win](https://git-scm.com/download/win)
   - Download the latest 64-bit version
   - Run the installer with default options

2. **Verify Git installation**
   - Open Command Prompt or PowerShell
   - Run:
   ```cmd
   git --version
   ```

#### Installing Node.js on Windows 11

1. **Download Node.js**
   - Visit [https://nodejs.org/](https://nodejs.org/)
   - Download the LTS (Long Term Support) version 18 or higher
   - The installer includes npm automatically

2. **Run the installer**
   - Execute the downloaded `.msi` file
   - Follow the installation wizard
   - Keep the default settings (includes npm and Add to PATH)

3. **Verify the installation**
   - Open a **new** Command Prompt or PowerShell window
   - Run:
   ```cmd
   node --version
   npm --version
   ```
   - You should see version 18.x.x or higher for Node.js

#### Choosing a Terminal on Windows 11

You have several options for running commands on Windows 11:

**Option 1: PowerShell (Recommended)**
- Press `Win + X` and select "Windows PowerShell" or "Terminal"
- Modern, powerful terminal with better scripting capabilities

**Option 2: Command Prompt**
- Press `Win + R`, type `cmd`, and press Enter
- Traditional Windows command line

**Option 3: Windows Terminal (Best)**
- Install from Microsoft Store (search "Windows Terminal")
- Modern terminal app with tabs, themes, and better performance
- Supports PowerShell, Command Prompt, and WSL

**Option 4: Git Bash**
- Installed automatically with Git for Windows
- Provides Unix-like bash environment on Windows
- Find it in Start Menu under "Git" folder

#### Cloning the Repository on Windows 11

1. **Open your preferred terminal** (PowerShell, Command Prompt, or Git Bash)

2. **Navigate to your desired directory**
   ```cmd
   cd C:\Users\YourUsername\Documents
   ```

3. **Clone the repository**
   ```cmd
   git clone https://github.com/killday/OdooTerminal.git
   cd OdooTerminal
   ```

4. **Install dependencies**
   ```cmd
   npm install
   ```

   > **Note:** On Windows, the installation might take a few minutes. If you encounter permission errors, try running your terminal as Administrator (right-click → "Run as administrator").

#### Building on Windows 11

The build commands work the same on Windows:

```cmd
npm run prod:build
```

Or for development mode:

```cmd
npm run dev:rollup:watch
```

> **Windows Path Note:** The extension files will be in the `dist` folder at `C:\Users\YourUsername\Documents\OdooTerminal\dist` (adjust path based on where you cloned the repository).

> **Note:** All npm scripts in this project use `cross-env` for cross-platform compatibility, so they work identically on Windows, macOS, and Linux.

#### Loading the Extension in Browsers on Windows 11

**Microsoft Edge (Native to Windows 11):**
1. Open Edge and navigate to `edge://extensions/`
2. Enable "Developer mode" (toggle in the left sidebar)
3. Click "Load unpacked"
4. Navigate to your OdooTerminal folder (e.g., `C:\Users\YourUsername\Documents\OdooTerminal`)
5. Select the folder and click "Select Folder"

**Google Chrome:**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right)
3. Click "Load unpacked"
4. Navigate to your OdooTerminal folder
5. Select the folder and click "Select Folder"

**Firefox:**
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Navigate to your OdooTerminal folder
4. Select the `manifest.json` file
5. Click "Open"

#### Windows 11-Specific Troubleshooting

**PowerShell Execution Policy Error:**
If you see "cannot be loaded because running scripts is disabled":
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Long Path Issues:**
Windows has a 260-character path limit by default. If you encounter path-related errors:
1. Press `Win + R`, type `regedit`, press Enter
2. Navigate to: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`
3. Set `LongPathsEnabled` to `1`
4. Restart your computer

Or use a shorter clone path like `C:\Dev\OdooTerminal`

**Node.js Not Recognized:**
If `node` or `npm` commands aren't recognized after installation:
1. Close all terminal windows
2. Open a **new** terminal window
3. If still not working, verify Node.js is in your PATH:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → "Environment Variables"
   - Check if `C:\Program Files\nodejs\` is in the PATH variable
   - Add it if missing, then restart your terminal

**Windows Defender/Antivirus:**
Some antivirus software may slow down `npm install`. If installation is very slow:
1. Add your project folder to the antivirus exclusion list
2. Specifically exclude the `node_modules` folder

---

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

   **Linux/Mac:**
   ```bash
   cd /path/to/OdooTerminal
   ```

   **Windows:**
   ```cmd
   cd C:\Users\YourUsername\Documents\OdooTerminal
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

   > **Windows Note:** If you encounter permission errors during the build, try running your terminal as Administrator.

4. **Reload the extension**

   **For Chrome:**
   - Go to `chrome://extensions/`
   - Find OdooTerminal
   - Click the **🔄 reload icon** (circular arrow)

   **For Edge (Windows 11):**
   - Go to `edge://extensions/`
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
   - Press `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
   - Clear cached images and files
   - Restart browser

3. **Check build output:**
   - Verify the `dist` folder was regenerated
   - Check timestamps on `dist/pub/loader.mjs`
   - Look for build errors in the terminal

4. **Windows-specific: Check file locks**
   - Close all browser instances completely
   - Check Task Manager (`Ctrl+Shift+Esc`) for lingering browser processes
   - End any browser processes, then rebuild

### Command Not Found

**Problem:** `clearcache` command shows "command not found" error.

**Solutions:**
1. **Verify build completed:**

   **Linux/Mac:**
   ```bash
   grep -r "clearcache" dist/pub/loader.mjs
   ```

   **Windows (PowerShell):**
   ```powershell
   Select-String -Path dist\pub\loader.mjs -Pattern "clearcache"
   ```

   **Windows (Command Prompt):**
   ```cmd
   findstr /s "clearcache" dist\pub\loader.mjs
   ```

   Should show the command registration.

2. **Check you're on the right branch:**
   ```bash
   git branch
   git log --oneline -5
   ```

3. **Rebuild from scratch:**

   **Linux/Mac:**
   ```bash
   npm run clean
   npm run prod:build
   ```

   **Windows:**
   ```cmd
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

   **Linux/Mac:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

   **Windows (PowerShell):**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

   **Windows (Command Prompt):**
   ```cmd
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   ```
   Ensure you have Node.js 18+ installed.

4. **Windows: Run as Administrator**
   - Right-click on your terminal (PowerShell/Command Prompt/Windows Terminal)
   - Select "Run as administrator"
   - Navigate to your project folder and run `npm install` again

### Windows-Specific Issues

**Problem:** `npm` commands are very slow on Windows

**Solution:**
- Add exclusions to Windows Defender for the project folder:
  1. Open Windows Security
  2. Go to "Virus & threat protection"
  3. Click "Manage settings" under "Virus & threat protection settings"
  4. Scroll down to "Exclusions" and click "Add or remove exclusions"
  5. Add your OdooTerminal folder (e.g., `C:\Users\YourUsername\Documents\OdooTerminal`)

**Problem:** Git bash shows strange characters or formatting issues

**Solution:**
- Use PowerShell or Windows Terminal instead
- Or update Git Bash configuration for better Unicode support

**Problem:** Path too long errors during `npm install`

**Solution:**
- Enable long paths in Windows (see Windows 11 Setup Guide above)
- Or move your project to a shorter path like `C:\Dev\OdooTerminal`

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
