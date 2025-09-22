// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import createRecord from '@odoo/orm/create_record';
import searchRead from '@odoo/orm/search_read';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import renderDependsItem from '@odoo/templates/depends_item';
import isEmpty from '@trash/utils/is_empty';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

// function sanitizeCmdModuleDepends(module_name: string) {
//   const OdooVerMajor = getOdooVersion('major');
//   if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 16) {
//     return `_______${module_name}`;
//   }
//   return module_name;
// }

async function cmdModuleDepends(
  this: Terminal,
  kwargs: CMDCallbackArgs,
  ctx: CMDCallbackContext,
): Promise<Array<string>> {

  // Get module ids
  const modules = await searchRead('ir.module.module', [['name', 'in', kwargs.module]], ['id'], await this.getContext());
  const module_ids = modules.map(item => item.id);
  if (isEmpty(module_ids)) {
    throw new Error(i18n.t('cmdDepends.error.noModulesFound', 'No modules found!'));
  }

  // Create wizard record
  const OdooVerMajor = getOdooVersion('major');
  let create_params = {};
  if (typeof OdooVerMajor === 'number') {
    if (OdooVerMajor >= 19) {
      create_params = {
        show_all: true,
        module_ids: [[6, false, module_ids]],
      };
    } else {
      create_params = {
        show_all: true,
        module_id: module_ids[0],
      };
    }
  }
  const wizard_id = (
    await createRecord(
      'base.module.uninstall',
      [create_params],
      await this.getContext(),
    )
  )[0];
  if (!wizard_id) {
    throw new Error(i18n.t('cmdDepends.error.noWizard', "Can't create wizard record!"));
  }

  // Get updated wizard record data
  const wizard_record = (
    await searchRead('base.module.uninstall', [['id', '=', wizard_id]], false, await this.getContext())
  )[0];

  let impacted_module_ids: Array<number> = [];
  if (typeof OdooVerMajor === 'number') {
    if (OdooVerMajor >= 19) {
      impacted_module_ids = wizard_record.impacted_module_ids;
    } else {
      impacted_module_ids = wizard_record.module_ids;
    }
  }

  if (isEmpty(impacted_module_ids)) {
    ctx.screen.printError(i18n.t('cmdDepends.error.notInstalled', "The module '{{module}}' isn't installed"), {
      module: kwargs.module,
    });
    return [];
  }

  // Get module names
  const impacted_modules = (
    await searchRead('ir.module.module', [['id', 'in', impacted_module_ids]], ['display_name'], await this.getContext())
  );

  const html_depends_items = impacted_modules.map(item => renderDependsItem(item.display_name, item.id));
  ctx.screen.print(html_depends_items);
  return impacted_modules;
}

async function getOptions(this: Terminal, arg_name: string): Promise<Array<string>> {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'name ASC'},
      item => item.name,
    );
  }
  return [];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdDepends.definition', 'Know modules that depends on the given module'),
    callback: cmdModuleDepends,
    options: getOptions,
    detail: i18n.t('cmdDepends.detail', 'Show a list of the modules that depends on the given module'),
    args: [[ARG.List|ARG.String, ['m', 'module'], false, i18n.t('cmdDepends.args.module', 'The module technical name')]],
    example: '-m base',
  };
}
