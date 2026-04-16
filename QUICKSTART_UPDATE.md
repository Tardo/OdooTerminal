# Quick Start: Update Extension with New clearcache Command

This is a quick reference for updating your OdooTerminal Chrome extension to get the new `clearcache` command.

## TL;DR - Quick Steps

```bash
# 1. Navigate to your OdooTerminal folder
cd /path/to/OdooTerminal

# 2. Get latest changes
git pull origin claude/clear-cache-odoo-18

# 3. Rebuild
npm run prod:build

# 4. Reload extension in Chrome
# Go to chrome://extensions/ and click the reload button 🔄
```

## Detailed Steps

### Step 1: Update the Code

Open your terminal/command prompt and run:

```bash
cd /path/to/OdooTerminal
git pull origin claude/clear-cache-odoo-18
```

### Step 2: Rebuild the Extension

```bash
npm run prod:build
```

Wait for the build to complete (should take 10-30 seconds).

### Step 3: Reload in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Find "OdooTerminal" in your extensions list
3. Click the **🔄 reload icon** (circular arrow button)

### Step 4: Test It!

1. Open any Odoo website
2. Press `Ctrl + ,` to open OdooTerminal
3. Type: `clearcache`
4. You should see: "Cache cleared successfully"

## Don't Have a Local Copy Yet?

If you haven't set up a development version yet, follow these steps:

```bash
# Clone the repository
git clone https://github.com/killday/OdooTerminal.git
cd OdooTerminal

# Checkout the branch with the new command
git checkout claude/clear-cache-odoo-18

# Install dependencies (first time only)
npm install

# Build the extension
npm run prod:build
```

Then load it in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the OdooTerminal folder

## Troubleshooting

**Command not found?**
- Make sure you ran `npm run prod:build`
- Check that `dist` folder was updated (look at file timestamps)
- Try removing and re-adding the extension in Chrome

**Build errors?**
- Run: `npm install` (updates dependencies)
- Clear and rebuild: `npm run clean && npm run prod:build`

**Still not working?**
- Check you're on the right branch: `git branch` (should show `claude/clear-cache-odoo-18`)
- See the full [INSTALLATION.md](INSTALLATION.md) guide for detailed troubleshooting

## What Does clearcache Do?

The `clearcache` command clears OdooTerminal's internal caches:
- Search/Read cache
- Service call cache
- Model multi-call cache

This is useful when cached data becomes stale, especially in Odoo 18+ environments.

## Need More Help?

- Full guide: [INSTALLATION.md](INSTALLATION.md)
- Report issues: [GitHub Issues](https://github.com/killday/OdooTerminal/issues)
