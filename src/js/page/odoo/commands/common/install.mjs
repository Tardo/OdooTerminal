// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModelMulti from '@odoo/osv/call_model_multi';
import searchRead from '@odoo/orm/search_read';
import {ARG} from '@trash/constants';
import {searchModules} from './__utils__';

async function cmdInstallModule(kwargs, screen) {
  return searchModules
    .bind(this)(kwargs.module)
    .then(result => {
      if (result.length) {
        return callModelMulti(
          'ir.module.module',
          result.map(item => item.id),
          'button_immediate_install',
          null,
          null,
          this.getContext(),
        ).then(
          () => {
            screen.print(
              `'${result
                .map(item => item.name)
                .join(', ')}' modules successfully installed`,
            );
            return result;
          },
          res => {
            throw new Error(
              res?.message?.data?.message ||
                'Unexpected error. Module not installed',
            );
          },
        );
      }
      throw new Error(`'${kwargs.module}' modules doesn't exists`);
    });
}

let cache = [];
async function getOptions(arg_name, arg_info, arg_value) {
  if (arg_name === 'module') {
    if (!arg_value) {
      const records = await searchRead(
        'ir.module.module',
        [],
        ['name'],
        this.getContext(),
      );
      cache = records.map(item => item.name);
      return cache;
    }
    return cache.filter(item => item.startsWith(arg_value));
  }
  return [];
}

export default {
  definition: 'Install a module',
  callback: cmdInstallModule,
  options: getOptions,
  detail: 'Launch module installation process.',
  args: [
    [ARG.List | ARG.String, ['m', 'module'], true, 'The module technical name'],
  ],
  example: '-m contacts',
};
