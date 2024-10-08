// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooSession from '@odoo/utils/get_odoo_session';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdContextOperation(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
  const session = getOdooSession();
  if (typeof session === 'undefined') {
    throw new Error(
      i18n.t('cmdContext.error.notSession', 'Cannot find session information')
    );
  }

  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 15) {
    if (kwargs.operation === 'set' || kwargs.operation === 'write' || kwargs.operation === 'delete') {
      // Soft-Error
      ctx.screen.printError(
        i18n.t('cmdContext.error.operationNotSupported', 'This operation is currently not supported in v15.0+'),
      );
      return;
    }
  }

  if (kwargs.operation === 'set') {
    session.user_context = kwargs.value;
  } else if (kwargs.operation === 'write') {
    Object.assign(session.user_context, kwargs.value);
  } else if (kwargs.operation === 'delete') {
    // $FlowFixMe
    if (Object.hasOwn(session.user_context, kwargs.value)) {
      // $FlowFixMe
      delete session.user_context[kwargs.value];
    } else {
      throw new Error(
        i18n.t('cmdContext.error.keyNotPresent', 'The selected key is not present in the terminal context'),
      );
    }
  }
  ctx.screen.print(session.user_context);
  return session.user_context;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdContext.definition', 'Operations over session context dictionary'),
    callback: cmdContextOperation,
    detail: i18n.t('cmdContext.detail', 'Operations over session context dictionary.'),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        false,
        i18n.t('cmdContext.args.operation', 'The operation to do'),
        'read',
        ['read', 'write', 'set', 'delete'],
      ],
      [ARG.Any, ['v', 'value'], false, i18n.t('cmdContext.args.value', 'The values')],
    ],
    example: '-o write -v {the_example: 1}',
  };
}
