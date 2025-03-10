// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getSessionInfo from '@odoo/net_utils/get_session_info';
import getOdooSession from '@odoo/utils/get_odoo_session';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdContextOperation(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
  let user_context = getOdooSession()?.user_context ?? (await getSessionInfo())?.user_context;
  if (typeof user_context === 'undefined') {
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
    const odoo_session = getOdooSession();
    if (typeof odoo_session?.user_context !== 'undefined') {
      odoo_session.user_context = kwargs.value;
      user_context = odoo_session.user_context;
    } else {
      const session_info = await getSessionInfo();
      if (typeof session_info?.user_context !== 'undefined') {
        session_info.user_context = kwargs.value;
        user_context = session_info.user_context;
      }
    }
  } else if (kwargs.operation === 'write') {
    Object.assign(user_context, kwargs.value);
  } else if (kwargs.operation === 'delete') {
    if (Object.hasOwn(user_context, kwargs.value)) {
      delete user_context[kwargs.value];
    } else {
      throw new Error(
        i18n.t('cmdContext.error.keyNotPresent', 'The selected key is not present in the terminal context'),
      );
    }
  }
  ctx.screen.print(user_context);
  return user_context;
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
