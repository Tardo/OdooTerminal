// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModelMulti from '@odoo/osv/call_model_multi';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import isEmpty from '@trash/utils/is_empty';
import {ARG} from '@trash/constants';
import {searchModules} from './__utils__';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdUninstallModule(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const modue_infos = await searchModules.bind(this)(kwargs.module);
  if (!isEmpty(modue_infos)) {
    if (!kwargs.force) {
      const res: mixed = await this.execute(`depends -m ${kwargs.module}`, false, true);
      if (typeof res === 'undefined') {
        return;
      }
      // $FlowFixMe
      const depends: $ReadOnlyArray<string> = res.filter(item => item !== kwargs.module);
      if (!isEmpty(depends)) {
        ctx.screen.print(i18n.t('cmdUninstall.result.willRemoved', 'This operation will remove these modules too:'));
        ctx.screen.print(depends);
        const res_quest = await ctx.screen.showQuestion(
          i18n.t('cmdUninstall.question.continue', 'Do you want to continue?'),
          ['y', 'n'],
          'n',
        );
        if (res_quest?.toLowerCase() !== 'y') {
          ctx.screen.printError(i18n.t('cmdUninstall.error.canceled', 'Operation cancelled'));
          return false;
        }
      }
    }

    await callModelMulti<boolean>(
      'ir.module.module',
      modue_infos[0].id,
      'button_immediate_uninstall',
      null,
      null,
      this.getContext(),
    );

    ctx.screen.print(
      i18n.t('cmdUninstall.result.success', "'{{module}}' ({{name}}) module successfully uninstalled", {
        module: kwargs.module,
        name: modue_infos[0].display_name,
      }),
    );
    return modue_infos[0];
  }
  throw new Error(
    i18n.t('cmdUninstall.error.notExist', "'{{module}}' module doesn't exists", {
      module: kwargs.module,
    }),
  );
}

function getOptions(this: Terminal, arg_name: string) {
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
    definition: i18n.t('cmdUninstall.definition', 'Uninstall a module'),
    callback: cmdUninstallModule,
    options: getOptions,
    detail: i18n.t('cmdUninstall.detail', 'Launch module deletion process.'),
    args: [
      [ARG.String, ['m', 'module'], true, i18n.t('cmdUninstall.args.module', 'The module technical name')],
      [ARG.Flag, ['f', 'force'], false, i18n.t('cmdUninstall.args.force', 'Forced mode')],
    ],
    example: '-m contacts',
  };
}
