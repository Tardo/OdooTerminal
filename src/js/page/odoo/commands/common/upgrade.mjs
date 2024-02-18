// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
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
              i18n.t(
                'cmdUpgrade.result.sucess',
                "'{{modules}}' modules successfully upgraded",
                {
                  modules: result.map(item => item.name).join(', '),
                },
              ),
            );
            return result;
          },
          res => {
            throw new Error(
              res?.message?.data?.message ||
                i18n.t(
                  'cmdUpgrade.error.notUpgraded',
                  'Unexpected error. Module not upgraded',
                ),
            );
          },
        );
      }
      throw new Error(
        i18n.t(
          'cmdUpgrade.error.notExist',
          "'{{module}}' modules doesn't exist",
          {
            module: kwargs.module,
          },
        ),
      );
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
  definition: i18n.t('cmdUpgrade.definition', 'Upgrade a module'),
  callback: cmdUpgradeModule,
  options: getOptions,
  detail: i18n.t('cmdUpgrade.detail', 'Launch upgrade module process.'),
  args: [
    [
      ARG.List | ARG.String,
      ['m', 'module'],
      true,
      i18n.t('cmdUpgrade.args.module', 'The module technical name'),
    ],
  ],
  example: '-m contacts',
};
