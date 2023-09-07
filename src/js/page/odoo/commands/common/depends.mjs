// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import getOdooVersionMajor from '@odoo/utils/get_odoo_version_major';
import isEmpty from '@terminal/utils/is_empty';
import {ARG} from '@trash/constants';

function sanitizeCmdModuleDepends(module_name) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 16) {
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

export default {
  definition: 'Know modules that depends on the given module',
  callback: cmdModuleDepends,
  detail: 'Show a list of the modules that depends on the given module',
  args: [[ARG.String, ['m', 'module'], false, 'The module technical name']],
  example: '-m base',
};
