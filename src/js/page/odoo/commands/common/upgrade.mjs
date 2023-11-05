// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModelMulti from '@odoo/osv/call_model_multi';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';
import {searchModules} from './__utils__';

async function cmdUpgradeModule(kwargs, screen) {
  return searchModules
    .bind(this)(kwargs.module)
    .then(result => {
      if (result.length) {
        return callModelMulti(
          'ir.module.module',
          result.map(item => item.id),
          'button_immediate_upgrade',
          null,
          null,
          this.getContext(),
        ).then(
          () => {
            screen.print(
              `'${result
                .map(item => item.name)
                .join(', ')}' modules successfully upgraded`,
            );
            return result;
          },
          res => {
            throw new Error(
              res?.message?.data?.message ||
                'Unexpected error. Module not upgraded',
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
  definition: 'Upgrade a module',
  callback: cmdUpgradeModule,
  options: getOptions,
  detail: 'Launch upgrade module process.',
  args: [
    [ARG.List | ARG.String, ['m', 'module'], true, 'The module technical name'],
  ],
  example: '-m contacts',
};
