// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import callModelMulti from '@odoo/osv/call_model_multi';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import isEmpty from '@terminal/utils/is_empty';
import {ARG} from '@trash/constants';
import {searchModules} from './__utils__';

async function cmdUninstallModule(kwargs, screen) {
  const modue_infos = await searchModules.bind(this)(kwargs.module);
  if (!isEmpty(modue_infos)) {
    if (!kwargs.force) {
      let depends = await this.execute(
        `depends -m ${kwargs.module}`,
        false,
        true,
      );
      if (isEmpty(depends)) {
        return;
      }
      depends = depends.filter(item => item !== kwargs.module);
      if (!isEmpty(depends)) {
        screen.print(
          i18n.t(
            'cmdUninstall.result.willRemoved',
            'This operation will remove these modules too:',
          ),
        );
        screen.print(depends);
        const res = await screen.showQuestion(
          i18n.t('cmdUninstall.question.continue', 'Do you want to continue?'),
          ['y', 'n'],
          'n',
        );
        if (res?.toLowerCase() !== 'y') {
          screen.printError(
            i18n.t('cmdUninstall.error.canceled', 'Operation cancelled'),
          );
          return false;
        }
      }
    }

    await callModelMulti(
      'ir.module.module',
      modue_infos[0].id,
      'button_immediate_uninstall',
      null,
      null,
      this.getContext(),
    );

    screen.print(
      i18n.t(
        'cmdUninstall.result.success',
        "'{{module}}' ({{name}}) module successfully uninstalled",
        {
          module: kwargs.module,
          name: modue_infos[0].display_name,
        },
      ),
    );
    return modue_infos[0];
  }
  throw new Error(
    i18n.t(
      'cmdUninstall.error.notExist',
      "'{{module}}' module doesn't exists",
      {
        module: kwargs.module,
      },
    ),
  );
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
  definition: i18n.t('cmdUninstall.definition', 'Uninstall a module'),
  callback: cmdUninstallModule,
  options: getOptions,
  detail: i18n.t('cmdUninstall.detail', 'Launch module deletion process.'),
  args: [
    [
      ARG.String,
      ['m', 'module'],
      true,
      i18n.t('cmdUninstall.args.module', 'The module technical name'),
    ],
    [
      ARG.Flag,
      ['f', 'force'],
      false,
      i18n.t('cmdUninstall.args.force', 'Forced mode'),
    ],
  ],
  example: '-m contacts',
};
