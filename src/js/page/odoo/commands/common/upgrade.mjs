// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModelMulti from '@odoo/osv/call_model_multi';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@trash/constants';
import {searchModules} from './__utils__';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdUpgradeModule(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const result = await searchModules.bind(this)(kwargs.module);
  if (result.length) {
    return callModelMulti<{...}>(
      'ir.module.module',
      result.map(item => item.id),
      'button_immediate_upgrade',
      null,
      null,
      await this.getContext(),
    ).then(
      () => {
        ctx.screen.print(
          i18n.t('cmdUpgrade.result.sucess', "'{{modules}}' modules successfully upgraded", {
            modules: result.map(item => item.name).join(', '),
          }),
        );
        return result;
      },
      res => {
        throw new Error(
          res?.message?.data?.message ||
            i18n.t('cmdUpgrade.error.notUpgraded', 'Unexpected error. Module not upgraded'),
        );
      },
    );
  }
  throw new Error(
    i18n.t('cmdUpgrade.error.notExist', "'{{module}}' modules doesn't exist", {
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
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdUpgrade.definition', 'Upgrade a module'),
    callback: cmdUpgradeModule,
    options: getOptions,
    detail: i18n.t('cmdUpgrade.detail', 'Launch upgrade module process.'),
    args: [[ARG.List | ARG.String, ['m', 'module'], true, i18n.t('cmdUpgrade.args.module', 'The module technical name')]],
    example: '-m contacts',
  };
}
