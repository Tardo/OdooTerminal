// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import isEmpty from '@trash/utils/is_empty';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

function sanitizeCmdModuleDepends(module_name: string) {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 16) {
    return `_______${module_name}`;
  }
  return module_name;
}

async function cmdModuleDepends(
  this: Terminal,
  kwargs: CMDCallbackArgs,
  ctx: CMDCallbackContext,
): Promise<Array<string>> {
  // $FlowFixMe
  return callModel<Object>(
    'res.config.settings',
    'onchange_module',
    [false, false, sanitizeCmdModuleDepends(kwargs.module)],
    null,
    this.getContext(),
  ).then(result => {
    let depend_names: Array<string> = [];
    if (isEmpty(result)) {
      ctx.screen.printError(i18n.t('cmdDepends.error.notInstalled', "The module '{{module}}' isn't installed"), {
        module: kwargs.module,
      });
    } else {
      depend_names = result.warning.message.substr(result.warning.message.search('\n') + 1).split('\n');
      ctx.screen.print(depend_names);
      return depend_names;
    }
    return depend_names;
  });
}

function getOptions(this: Terminal, arg_name: string): Promise<Array<string>> {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      this.getContext({active_test: true}),
      item => item.name,
    );
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdDepends.definition', 'Know modules that depends on the given module'),
    callback: cmdModuleDepends,
    options: getOptions,
    detail: i18n.t('cmdDepends.detail', 'Show a list of the modules that depends on the given module'),
    args: [[ARG.String, ['m', 'module'], false, i18n.t('cmdDepends.args.module', 'The module technical name')]],
    example: '-m base',
  };
}
