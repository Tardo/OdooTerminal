// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import isEmpty from '@terminal/utils/is_empty';
import {ARG} from '@trash/constants';

function sanitizeCmdModuleDepends(module_name) {
  const OdooVerMajor = getOdooVersion('major');
  if (OdooVerMajor >= 16) {
    return `_______${module_name}`;
  }
  return module_name;
}

async function cmdModuleDepends(kwargs, screen) {
  return callModel(
    'res.config.settings',
    'onchange_module',
    [false, false, sanitizeCmdModuleDepends(kwargs.module)],
    null,
    this.getContext(),
  ).then(result => {
    let depend_names = [];
    if (isEmpty(result)) {
      screen.printError(`The module '${kwargs.module}' isn't installed`);
    } else {
      depend_names = result.warning.message
        .substr(result.warning.message.search('\n') + 1)
        .split('\n');
      screen.print(depend_names);
      return depend_names;
    }
    return depend_names;
  });
}

function getOptions(arg_name) {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      this.getContext({active_test: true}),
      null,
      item => item.name,
    );
  }
  return Promise.resolve([]);
}

export default {
  definition: 'Know modules that depends on the given module',
  callback: cmdModuleDepends,
  options: getOptions,
  detail: 'Show a list of the modules that depends on the given module',
  args: [[ARG.String, ['m', 'module'], false, 'The module technical name']],
  example: '-m base',
};
