## Display the model name and id of the active document

- Go to the options of the extension.
- Add the following code in the 'Init Commands' section:
  `function showActiveModelID() { notify -m "Model: " + $$RMOD + " [ID: " + $$RID + "]" -t "Active model/id information" --type info }`.
- Define a keyboard shortcut for the command `showActiveModelID`.
- Save changes.
