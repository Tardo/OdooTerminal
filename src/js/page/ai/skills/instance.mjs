// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {SkillDef} from '@ai/skills/__all__';


const content: string =
  '# SKILL: Odoo Instance Discovery\n' +
  'Context about the running Odoo instance. Run `whoami` + `version` at the start of any multi-step task that depends on user, company, or version.\n' +
  '\n' +
  '## Active User — `whoami`\n' +
  'Returns: `login`, `display_name`, `user_id`, `partner` ([id, name]), `company` ([id, name]), `companies` (list), `groups` (list).\n' +
  '```\n' +
  '$me = (whoami)\n' +
  'print -m "User: " + $me["display_name"] + " | Company: " + $me["company"][1]\n' +
  '```\n' +
  'System helpers `$$UID`, `$$UNAME`, `$$RMOD`, `$$RID` — see §7 of the base prompt (standalone arguments only; use `$id = $$UID` before embedding in domains).\n' +
  '\n' +
  '## Odoo Version — `version`\n' +
  'Returns [major, minor, patch, release_type, serial]:\n' +
  '```\n' +
  '$ver = (version)\n' +
  'print -m "Odoo " + $ver[0] + "." + $ver[1]\n' +
  '```\n' +
  '\n' +
  '## Installed Modules\n' +
  '`depends -m base` → ALL installed modules (every installed module depends on `base`); each item `{display_name, name, id}`. Fastest full list.\n' +
  'Details and filtering via `ir.module.module` (fields: `name`, `display_name`, `summary`, `description`, `installed_version`, `state`, `author`, `website`, `category_id`; states: `installed`, `uninstalled`, `to install`, `to upgrade`, `to remove`):\n' +
  '```\n' +
  '// Is a specific module installed?\n' +
  'search -m ir.module.module -d [["name","=","sale"],["state","=","installed"]] -f name,display_name,installed_version\n' +
  '// All installed modules with details\n' +
  'search -m ir.module.module -d [["state","=","installed"]] -f name,display_name,summary,installed_version\n' +
  '```\n' +
  'Confirm a module is installed before querying its models.\n' +
  '\n' +
  '## Company Info — `res.company`\n' +
  '```\n' +
  'search -m res.company -f name,partner_id,currency_id,country_id,email,phone,vat\n' +
  '```\n' +
  'Active company ID comes from `whoami` → `company`.\n' +
  '\n' +
  '## System Parameters — `sysparam`\n' +
  '```\n' +
  'sysparam -o list\n' +
  'sysparam -o get -k web.base.url\n' +
  '```\n' +
  'Useful keys: `web.base.url`, `database.uuid`, `database.create_date`.\n' +
  '\n' +
  '## Languages & Currencies\n' +
  '```\n' +
  'search -m res.lang -d [["active","=",true]] -f name,code\n' +
  'search -m res.currency -d [["active","=",true]] -f name,symbol,rate\n' +
  '```\n' +
  '\n' +
  '## Discovering Fields in OCA / Private Models\n' +
  'For non-standard models NEVER assume field names — semantic-search `field_description` instead of loading the full schema:\n' +
  '```\n' +
  '// e.g. looking for a credit limit field on res.partner\n' +
  'search -m ir.model.fields -d [["model_id.model","=","res.partner"],["field_description","ilike","credit limit"]] -f name,ttype,field_description,modules\n' +
  '```\n' +
  'The `modules` field tells you which OCA/private module defines the field. All models registered by a module:\n' +
  '```\n' +
  'search -m ir.model -d [["modules","like","<module_name>"]] -f model,name\n' +
  '```\n';

const skill: SkillDef = {
  name: 'instance',
  description: 'Odoo instance discovery: active user (whoami), version, installed modules, company, system parameters, languages, currencies, and semantic field discovery for OCA/private models.',
  content: (): string => content,
};

export default skill;
