// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModelMulti from '@odoo/osv/call_model_multi';
import cachedSearchRead from '@odoo/utils/cached_search_read';
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

function getOptions(arg_name) {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module',
      'ir.module.module',
      [],
      ['name'],
      this.getContext(),
      null,
      item => item.name,
    );
  }
  return Promise.resolve([]);
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
