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

async function cmdInstallModule(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  return searchModules
    .bind(this)(kwargs.module)
    .then(result => {
      if (result.length) {
        // $FlowFixMe
        return callModelMulti<Object>(
          'ir.module.module',
          result.map(item => item.id),
          'button_immediate_install',
          null,
          null,
          this.getContext(),
        ).then(
          () => {
            ctx.screen.print(
              i18n.t('cmdInstall.result.success', '{{modules}} modules successfully installed', {
                modules: result.map(item => item.name).join(', '),
              }),
            );
            return result;
          },
          res => {
            throw new Error(
              res?.message?.data?.message ||
                i18n.t('cmdInstall.error.moduleNotInstalled', 'Unexpected error. Modules not installed'),
            );
          },
        );
      }
      throw new Error(
        i18n.t('cmdInstall.error.moduleNotExist', "'{{module}}' modules doesn't exist", {
          module: kwargs.module,
        }),
      );
    });
}

function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module',
      'ir.module.module',
      [],
      ['name'],
      this.getContext(),
      undefined,
      {orderBy: 'name ASC'},
      item => item.name,
    );
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdInstall.definition', 'Install a module'),
    callback: cmdInstallModule,
    options: getOptions,
    detail: i18n.t('cmdInstall.detail', 'Launch module installation process.'),
    args: [[ARG.List | ARG.String, ['m', 'module'], true, i18n.t('cmdInstall.args.module', 'The module technical name')]],
    example: '-m contacts',
  };
}
