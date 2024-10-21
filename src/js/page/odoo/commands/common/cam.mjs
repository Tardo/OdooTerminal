// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdCheckModelAccess(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  return callModel<boolean>(
    kwargs.model,
    'check_access_rights',
    [kwargs.operation, false],
    null,
    await this.getContext(),
  ).then(result => {
    if (result) {
      ctx.screen.print(
        i18n.t('cmdCam.result.haveAccessRights', "You have access rights for '{{operation}}' on {{model}}", {
          operation: kwargs.operation,
          model: kwargs.model,
        }),
      );
    } else {
      ctx.screen.print(
        i18n.t('cmdCam.result.notAccessRights', "You can't '{{operation}}' on {{model}}", {
          operation: kwargs.operation,
          model: kwargs.model,
        }),
      );
    }
    return result;
  });
}

async function getOptions(this: Terminal, arg_name: string): Promise<Array<string>> {
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
    definition: i18n.t('cmdCam.definition', 'Check model access'),
    callback: cmdCheckModelAccess,
    options: getOptions,
    detail: i18n.t('cmdCam.detail', 'Show access rights for the selected operation on the selected model'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdCam.args.model', 'The model technical name')],
      [
        ARG.String,
        ['o', 'operation'],
        true,
        i18n.t('cmdCam.args.operation', 'The operation to do'),
        undefined,
        ['create', 'read', 'write', 'unlink'],
      ],
    ],
    example: '-m res.partner -o read',
  };
}
