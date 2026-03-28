# OdooTerminal: Full Administrator Command Reference

OdooTerminal is a browser-based CLI that allows Odoo administrators to perform advanced tasks without navigating
multiple menus.

## 1. Module & App Management

These commands handle the lifecycle of Odoo modules and are critical for server maintenance.

### install - Install a Module

Installs a new module by its technical name.

- Syntax: install -m <module_name>
- Example: install -m crm

### uninstall - Uninstall a Module

Removes a module and its data.

- Syntax: uninstall -m <module_name> [--force]
- Flags:
  - -m, --module: (Required) Technical name.
  - -f, --force: Skips dependency warnings and confirmation prompts.
- Example: uninstall -m website_sale

### upgrade - Upgrade a Module

Forces an update of an already installed module.

- Syntax: upgrade -m <module_name>
- Example: upgrade -m base

### ual - Update Apps List

Scans the addons directory for new modules (Equivalent to "Update Apps List" in the Odoo UI).

- Syntax: ual

## 2. Record & Data Operations (CRUD)

Perform database operations directly from the command line.

### search - Find Records

Search for records using Odoo domain syntax.

- Syntax: search -m <model> -d <domain> [-f <fields>] [-l <limit>] [-o <order>]
- Example: search -m res.partner -d "[[&#39;customer_rank&#39;, &#39;&gt;&#39;, 0]]" -f "name,email" -l 10

### read - Read Record Data

Retrieve field values for specific record IDs.

- Syntax: read -m <model> -i <ids> [-f <fields>]
- Example: read -m res.users -i 1,5,10 -f "login,lang"

### create - Create New Record

Create a new entry in a model.

- Syntax: create -m <model> -v <values_json>
- Example: create -m mail.channel -v "{&#39;name&#39;: &#39;Support-Chat&#39;, &#39;channel_type&#39;: &#39;chat&#39;}"

### write - Update Existing Record

Modify an existing record&#39;s data.

- Syntax: write -m <model> -i <id> -v <values_json>
- Example: write -m res.partner -i 42 -v "{&#39;email&#39;: &#39;new-contact@company.com&#39;}"

### unlink - Delete Record

Permanently delete a record from the database.

- Syntax: unlink -m <model> -i <id>
- Example: unlink -m ir.attachment -i 552

## 3. System Utilities & Troubleshooting

### sysparam - System Parameters

View or edit values in ir.config_parameter.

- Syntax: sysparam -k <key> [-v <value>]
- Example (Get): sysparam -k web.base.url
- Example (Set): sysparam -k database.secret -v "my-new-secret"

### metadata - Record Metadata

View technical details like XML ID, Creator ID, and Creation Date.

- Syntax: metadata -m <model> -i <id>
- Example: metadata -m product.template -i 101

### whoami - Session Information

Displays the current user ID and context details.

- Syntax: whoami

### depends - Dependency Check

Lists all modules that depend on a specific module.

- Syntax: depends -m <module_name>

### call - Execute Method

Trigger any public Odoo method directly.

- Syntax: call -m <model> -c <method> -a <args> -k <kwargs>
- Example: call -m res.users -c "action_reset_password" -a "[1]"

### version - Version Info

Displays the current Odoo server version.

- Syntax: version

### clearcache - Clear Internal Caches

Clears all internal caches used by the terminal extension. This is particularly useful in Odoo 18+ environments where
cached data may become stale after upgrades or configuration changes.

- Syntax: clearcache
- Note: Clears search/read cache, service call cache, and model multi-call cache

## 4. UI & Interface Control

### view - Open in UI

Opens the standard Odoo form view for a specific record in your browser.

- Syntax: view -m <model> -i <id>

### debug - Developer Mode

Enables or disables Odoo&#39;s developer mode.

- Syntax: debug [1|0|assets]
- Example: debug assets (Enables debug with assets)
