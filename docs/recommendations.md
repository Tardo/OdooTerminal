# Recommendations

## Display the Active Model and Record ID

You can create a reusable command to display the model name and record ID of the currently open document without
opening the terminal manually.

**Setup:**

1. Open the extension options page.
2. In the **Init Commands** section, add the following:
   ```
   function showActiveModelID() { notify -m "Model: " + $$RMOD + " [ID: " + $$RID + "]" -t "Active model/id information" --type info }
   ```
3. Go to the **Keyboard Shortcuts** section and assign a shortcut to the `showActiveModelID` command.
4. Save the changes.

After saving, the shortcut will trigger a notification with the active model and ID on any Odoo backend view.

---

## Preload Custom Aliases or Scripts at Startup

The extension options page includes an **Init Commands** section where you can define commands that run automatically
on every page load. This is useful for:

- Declaring aliases that you use frequently.
- Loading a remote TraSH script to extend terminal functionality.

Example — define a shorthand alias for a common search:

```
alias -n partners -c "search res.partner -f name,email"
```
