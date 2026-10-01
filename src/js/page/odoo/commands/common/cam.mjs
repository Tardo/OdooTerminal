// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {getModelOptions} from './__utils__';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdCheckModelAccess(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const version = getOdooVersion('major');
  const useHasAccess = typeof version === 'number' && version >= 20;
  return callModel<boolean>(
    kwargs.model,
    useHasAccess ? 'has_access' : 'check_access_rights',
    useHasAccess ? [[], kwargs.operation] : [kwargs.operation, false],
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

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdCam.definition', 'Check model access'),
    callback: cmdCheckModelAccess,
    options: getModelOptions,
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
