// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdDoc(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<void> {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number' && OdooVerMajor < 19) {
    // Soft-Error
    ctx.screen.printError(
      i18n.t('cmdDoc.error.incompatibleOdooVersion', 'This command is only available in Odoo 19.0+'),
    );
    return;
  }

  let pathname = '/doc';
  if (kwargs.model) {
    pathname += `/${kwargs.model}`;
  }
  if (kwargs.method) {
    pathname += `#${kwargs.method}`;
  }
  window.location = `${window.location.origin}${pathname}`;
}

async function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'model ASC'},
      item => item.model,
    );
  }
  return [];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdDoc.definition', 'Open thecnical documentation page'),
    callback: cmdDoc,
    options: getOptions,
    detail: i18n.t('cmdDoc.detail', 'Open thecnical documentation page.'),
    args: [
      [
        ARG.String,
        ['m', 'model'],
        false,
        i18n.t('cmdDoc.args.model', 'The model technical name'),
      ],
      [
        ARG.String,
        ['me', 'method'],
        false,
        i18n.t('cmdDoc.args.method', 'The method name'),
      ],
    ],
    example: '-m sale_management',
  };
}
