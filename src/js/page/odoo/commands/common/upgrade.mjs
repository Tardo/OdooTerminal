// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from '@odoo/rpc';
import {ARG} from '@trash/constants';
import {searchModules} from './__utils__';

async function cmdUpgradeModule(kwargs) {
  return searchModules
    .bind(this)(kwargs.module)
    .then(result => {
      if (result.length) {
        return rpc
          .query({
            method: 'button_immediate_upgrade',
            model: 'ir.module.module',
            args: [result.map(item => item.id)],
          })
          .then(
            () => {
              this.screen.print(
                `'${result
                  .map(item => item.name)
                  .join(', ')}' modules successfully upgraded`,
              );
              return result;
            },
            res => {
              throw new Error(res.message.data.message);
            },
          );
      }
      throw new Error(`'${kwargs.module}' modules doesn't exists`);
    });
}

export default {
  definition: 'Upgrade a module',
  callback: cmdUpgradeModule,
  detail: 'Launch upgrade module process.',
  args: [
    [ARG.List | ARG.String, ['m', 'module'], true, 'The module technical name'],
  ],
  example: '-m contacts',
};
