![Mozilla Add-on](https://img.shields.io/amo/v/odoo-terminal?style=for-the-badge)
![Mozilla Add-on](https://img.shields.io/amo/users/odoo-terminal?style=for-the-badge)
![Mozilla Add-on](https://img.shields.io/amo/dw/odoo-terminal?style=for-the-badge)

![Chrome Add-on](https://img.shields.io/chrome-web-store/v/fdidojpjkbpfplcdmeaaehnjfkgpbhad?style=for-the-badge)
![Chrome Add-on](https://img.shields.io/chrome-web-store/users/fdidojpjkbpfplcdmeaaehnjfkgpbhad?style=for-the-badge)

<h1 align="center">
  <img src="icons/terminal-48.png" />
  <div>Odoo Terminal - WebExtension</div>
</h1>
<p align="center">
The BFG10k for Odoo developers
</p>
<p align="center">
All the power of Odoo json-rpc in a really easy way!
</p>

This web extension adds a terminal-like to control Odoo (11 to 16). All
implemented commands use the tools provided by the Odoo framework. An unwavering
policy when developing this extension is to not modify or alter in any way the
Odoo classes. This sometimes results in certain commands having
reduced/increased capabilities depending on the Odoo version.

The terminal is fully initialized when it is first opened after loading the
page. The time overhead for using this extension is ~345ms (async).

**Downloads**

[<img src="https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo-lg.3d9087ac44e8.png" width="64">](https://addons.mozilla.org/es/firefox/addon/odoo-terminal/)
[<img src="https://www.google.com/chrome/static/images/chrome-logo.svg" width="64">](https://chrome.google.com/webstore/detail/odoo-terminal/fdidojpjkbpfplcdmeaaehnjfkgpbhad)

---

# Usage

When you visit a Odoo website, the browser action icon of the extension turn to
enabled state. This indicates that the extension is ready to use in the current
page.

Few commands aren't available on the frontend, use command 'help' to know the
available commands.

You can toggle terminal using one of these options:

- Press CTRL + , (by default)
- Use extension browser action icon

## Example Commands

| Description                                         | Terminal Command                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| Create 'res.partner' record                         | `create -m res.partner -v {name: 'Hipcut', street: 'Mystery street'}` |
| Search 'res.partner' records                        | `search -m res.partner -f name,email -d [['id', '>', 5]]`             |
| Search all fields of selected 'res.partner' records | `search -m res.partner -f * -d [['id', '>', 5]]`                      |
| Read all fields of selected 'res.partner' record    | `read -m res.partner -i 5 -f *`                                       |
| Read all fields of various 'res.partner' records    | `read -m res.partner -i 5,15,8 -f *`                                  |
| View 'res.partner' records _(only backend)_         | `view -m res.partner`                                                 |
| View selected 'res.partner' record _(only backend)_ | `view -m res.partner -i 4`                                            |
| Install module                                      | `install -m mymodule`                                                 |
| Create alias                                        | `alias -n myalias -c "print My name is $1"`                           |

> Notice that a list is an string of values separated by commas. Example: "5,
> 15, 8" (quotes included) or can use array [5, 15, 8]

> Notice that can call commands without 'named arguments', for example:
> `create res.partner {name: 'Hipcut', street: 'Mystery street'}`. The rule is
> that 'unnamed arguments' fill values following the order of the command
> arguments definition. So mix 'unnamed' with 'named' arguments can be done as
> long as the order is maintained.

## Notes

- This extension have a "preferences" page where you can add commands to run on
  every session. This is useful for example to load a remote script to extend
  the 'terminal' features or declare custom aliases.
- This extension uses an internal context to extend the 'user context'. This
  'terminal context' has by default the key 'active_test' = false (see issue #14
  to get more information). This context only affects to terminal operations.
- The maximum buffered screen lines is set to 750. So, you can't see more than
  749 records in the same query. This is necessary to avoid have a lot of
  nodes... One of the problems of use HTML elements to render the output :/

---

## Advance Usage

#### + Recordsets

`search`, `read` and `create` commands returns `recordsets`. Can use them to
write values with `commit` command.

Example:

```
$rs = $(search res.partner)
$rs[4]['name'] = 'The Name'
$rs[2]['name'] = 'Other Name'
commit $rs

$record = $(read res.partner 8)
$record['name'] = 'Willy Wonka'
$record['city'] = 'O Courel'
commit $record

$new_rec = $(create res.partner {name: 'The test'})
print $new_rec
```

#### + Positional replacements for aliases

You can define aliases to call commands with predefined values. This command can
use positional replacements.

The anatomy of a positional replacement is: `$num[default_value]` or `$num`

For example:

- First positional replacement (without default value = empty):
  `alias -n my_alias -c "print -m 'Hello, $1'"`
- Fist position replacement with default value 'world':
  `alias -n my_alias -c "print -m 'Hello, $1[world]'"`
- A somewhat more complex:
  `alias -n search_mod -c "search -m ir.module.module -f display_name -d [[name, =, '$1'], [state, =, '$2[installed]']]"`

#### + Runners (subcommands)

You can execute "subcommands" to use the result in a new command call. The
syntax of runners looks like `$(command)`.

For example: `read -m res.users -i $(search -m res.users -f id)[0]['id']` or
`read -m res.users -i $(search -m res.users -f id)['ids']`

#### + Massive operations

Massive operations are possible using the command `repeat`. Print to screen is a
expensive task, consider use the `--silent` argument to increase the
performance.

Examples:

- Create 5000 res.partner:
  `repeat -t 5000 -c "create -m res.partner -v {name: $(gen str 12 8) + ' (Test)'}" --silent`
- Cancel all sale.order:
  `$orders = $(search sale.order); repeat -t $orders['length'] -c "call sale.order action_cancel [$orders[$(gen intiter)]['id']]"`

#### + Send files

Can use the command 'genfile' to create a file object that can be sent via post.

Example:

- `post /web/binary/upload_attachment -d {callback: '', model: 'res.partner', id: 1, ufile: $(genfile)}`

#### + Websockets

Can open websocket connections (Odoo 16.0+).

Example:

- ```
  $webs = $(ws -o open -e /websocket)
  ws -o send -wo $webs -d "hello"
  ```

#### + Math operations

The way to do math operations is pretty similar to 'shell script' syntax:
`$((<OPERATION>))`

Examples:

- Print 3*2 result: `print $((3*2))`
- Modify the lst_price of the 3,product.product:
  `$prod = $(read product.product 3 -f lst_price); $prod['lst_price'] = $((5*$prod['lst_price'])); commit $prod;`

---

# Extension Permissions

| Permission | Description                                           | Reason                    |
| ---------- | ----------------------------------------------------- | ------------------------- |
| activeTab  | Enables support to get information about browser tabs | Used to detect Odoo pages |
| storage    | Enables support to manage stored data in the browser  | Used for preferences      |

---

# Contributing

- [contributing.md](./docs/contributing.md)

---

# Changelog

- [CHANGELOG.md](CHANGELOG.md)

---

# License

Copyright Alexandre Díaz & contributors

AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

All content under 'icons/' has its own licenses and original authors.
