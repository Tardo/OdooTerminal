// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdSetDebugMode(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  let location = '';
  let location_search = false;
  if (kwargs.mode === 0) {
    ctx.screen.print(i18n.t('cmdDebug.result.disabled', 'Debug mode <strong>disabled</strong>'));
    const qs = $.deparam.querystring();
    delete qs.debug;
    location_search = true;
    location = `?${$.param(qs)}`;
  } else if (kwargs.mode === 1) {
    ctx.screen.print(i18n.t('cmdDebug.result.enabled', 'Debug mode <strong>enabled</strong>'));
    location = $.param.querystring(window.location.href, 'debug=1');
  } else if (kwargs.mode === 2) {
    ctx.screen.print(i18n.t('cmdDebug.result.enabledAssets', 'Debug mode with assets <strong>enabled</strong>'));
    location = $.param.querystring(window.location.href, 'debug=assets');
  }

  if (location) {
    ctx.screen.print(i18n.t('cmdDebug.result.reload', 'Reloading page...'));
    if (location_search) {
      window.location.search = location;
    } else {
      window.location = location;
    }
  } else {
    throw new Error(i18n.t('cmdDebug.error.invalidDebugMode', 'Invalid debug mode'));
  }
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdDebug.definition', 'Set debug mode'),
    callback: cmdSetDebugMode,
    detail: i18n.t('cmdDebug.detail', 'Set debug mode'),
    args: [
      [
        ARG.Number,
        ['m', 'mode'],
        true,
        i18n.t('cmdDebug.args.mode', 'The mode<br>- 0: Disabled<br>- 1: Enabled<br>- 2: Enabled with Assets'),
        undefined,
        [0, 1, 2],
      ],
    ],
    example: '-m 2',
  };
}
