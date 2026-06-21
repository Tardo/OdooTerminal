// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {SkillDef} from '@ai/skills/__all__';


const content: string =
  '# SKILL: Odoo Instance Discovery\n' +
  'Use this skill FIRST when you need context about the running Odoo instance before executing other tasks.\n' +
  '\n' +
  '## Active User — `whoami`\n' +
  'Returns an object with: `login`, `display_name`, `user_id`, `partner` ([id, name]), `company` ([id, name]), `companies` (list), `groups` (list).\n' +
  '```\n' +
  'whoami\n' +
  '```\n' +
  'Capture and use fields:\n' +
  '```\n' +
  '$me = (whoami)\n' +
  'print -m "User: " + $me["display_name"] + " | Company: " + $me["company"][1]\n' +
  '```\n' +
  'System helpers (standalone args only, never inside arrays/dicts):\n' +
  '- `$$UID` — current user ID (number)\n' +
  '- `$$UNAME` — current username/login (string)\n' +
  '\n' +
  '## Odoo Version — `version`\n' +
  'Returns an array: [major, minor, patch, release_type, serial].\n' +
  '```\n' +
  'version\n' +
  '```\n' +
  'Capture example:\n' +
  '```\n' +
  '$ver = (version)\n' +
  'print -m "Odoo " + $ver[0] + "." + $ver[1]\n' +
  '```\n' +
  '\n' +
  '## Installed Modules — `depends -m base`\n' +
  '`depends -m base` returns ALL installed modules (every installed module depends on `base`).\n' +
  'Each item: `{display_name, name, id}`.\n' +
  '```\n' +
  'depends -m base\n' +
  '```\n' +
  'To check if a specific module is installed:\n' +
  '```\n' +
  'search ir.module.module -d [["name","=","sale"],["state","=","installed"]] -f name,display_name,installed_version\n' +
  '```\n' +
  'Full module list with details:\n' +
  '```\n' +
  'search ir.module.module -d [["state","=","installed"]] -f name,display_name,summary,installed_version\n' +
  '```\n' +
  '\n' +
  '## Module Details — `ir.module.module`\n' +
  'Key fields: `name`, `display_name`, `summary`, `description`, `installed_version`, `state`, `author`, `website`, `category_id`.\n' +
  'States: `installed`, `uninstalled`, `to install`, `to upgrade`, `to remove`.\n' +
  '```\n' +
  '// Full info for one module\n' +
  'search ir.module.module -d [["name","=","account"]] -f name,display_name,summary,installed_version,state,author\n' +
  '// All installed modules by category\n' +
  'search ir.module.module -d [["state","=","installed"]] -f name,category_id,installed_version\n' +
  '```\n' +
  '\n' +
  '## Company Info — `res.company`\n' +
  '```\n' +
  'search res.company -f name,partner_id,currency_id,country_id,email,phone,vat\n' +
  '```\n' +
  'Active company ID comes from `whoami` → `company` field.\n' +
  '\n' +
  '## System Parameters — `sysparam`\n' +
  '```\n' +
  '// List all\n' +
  'sysparam -o list\n' +
  '// Get a specific parameter\n' +
  'sysparam -o get -k web.base.url\n' +
  'sysparam -o get -k database.uuid\n' +
  '```\n' +
  'Useful keys: `web.base.url`, `database.uuid`, `database.create_date`.\n' +
  '\n' +
  '## Active Languages — `res.lang`\n' +
  '```\n' +
  'search res.lang -d [["active","=",true]] -f name,code\n' +
  '```\n' +
  '\n' +
  '## Active Currencies — `res.currency`\n' +
  '```\n' +
  'search res.currency -d [["active","=",true]] -f name,symbol,rate\n' +
  '```\n' +
  '\n' +
  '## Tips\n' +
  '- Run `whoami` + `version` at the start of any multi-step task that depends on user, company, or version.\n' +
  '- Use `depends -m base` to confirm a module is installed before querying its models.\n' +
  '- `$$UID` is only valid as a standalone argument; use `$id = $$UID` before embedding in domains.\n' +
  '- `ir.module.module` is the canonical source for module metadata; `depends -m base` is a faster shortcut for the full installed list.\n';

const skill: SkillDef = {
  name: 'instance',
  description: 'Odoo instance discovery: active user (whoami), Odoo version, installed modules (depends/ir.module.module), company, system parameters, languages, currencies.',
  content: (): string => content,
};

export default skill;
