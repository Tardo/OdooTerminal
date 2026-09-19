// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import uniqueId from '@common/utils/unique_id';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdExportVar(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<string> {
  const varname = uniqueId('term');
  window[varname] = kwargs.value;
  ctx.screen.print(
    i18n.t(
      'cmdExportVar.resultExported',
      "Command result exported! now you can use '{{varname}}' variable in the browser console",
      {varname},
    ),
  );
  return varname;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdExportVar.definition', 'Exports the command result to a browser console variable'),
    category: 'terminal',
    callback: cmdExportVar,
    detail: i18n.t('cmdExportVar.detail', 'Exports the command result to a browser console variable.'),
    args: [[ARG.Any, ['v', 'value'], true, i18n.t('cmdExportVar.args.value', 'The value to export')]],
    example: '-v (search res.partner)',
  };
}
