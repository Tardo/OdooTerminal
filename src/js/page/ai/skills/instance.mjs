// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {SkillDef} from '@ai/skills/__all__';


const content: string =
  '# SKILL: Odoo Instance Discovery\n' +
  '\n' +
  '## Installed Modules — fastest full list\n' +
  '`depends -m base` → ALL installed modules (every installed module depends on `base`); each item `{display_name, name, id}`.\n' +
  'Filtering via `ir.module.module` (fields: `name`, `display_name`, `summary`, `description`, `installed_version`, `state`, `author`, `website`, `category_id`; states: `installed`, `uninstalled`, `to install`, `to upgrade`, `to remove`):\n' +
  '```\n' +
  '// Is a specific module installed?\n' +
  'search -m ir.module.module -d [["name","=","sale"],["state","=","installed"]] -f name,display_name,installed_version\n' +
  '```\n' +
  'Confirm a module is installed before querying its models.\n' +
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
  description: 'Odoo instance discovery: fastest way to list all installed modules, and semantic field discovery for OCA/private models.',
  content: (): string => content,
};

export default skill;
