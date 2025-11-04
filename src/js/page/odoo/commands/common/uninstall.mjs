// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModelMulti from '@odoo/osv/call_model_multi';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
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
      const depends: $ReadOnlyArray<{
        id: number,
        display_name: string,
        // $FlowFixMe
      }> = res.filter(item => item.id !== modue_infos[0].id);
      if (!isEmpty(depends)) {
        const depend_name_lines = depends.map(item => `${item.display_name} [<span class='o_terminal_click o_terminal_cmd' data-cmd='view ir.module.module ${item.id}'>#${item.id}</span>]`);
        ctx.screen.print(i18n.t('cmdUninstall.result.willRemoved', 'This operation will remove these modules too:'));
        ctx.screen.print(depend_name_lines);
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
      await this.getContext(),
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

async function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'name ASC'},
      item => item.name,
    );
  }
  return [];
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
