// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import save2file from '@terminal/utils/save2file';
import uniqueId from '@terminal/utils/unique_id';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdExportFile(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<string> {
  const filename = `${uniqueId('term')}_${new Date().getTime()}.json`;
  const data = JSON.stringify(kwargs.value, null, 4);
  save2file(filename, 'text/json', data);
  ctx.screen.print(
    i18n.t('cmdExportFile.resultExported', "Command result exported to '{{filename}}' file", {filename}),
  );
  return filename;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdExportFile.definition', 'Exports the command result to a text/json file'),
    callback: cmdExportFile,
    detail: i18n.t('cmdExportFile.detail', 'Exports the command result to a text/json file.'),
    args: [[ARG.Any, ['v', 'value'], true, i18n.t('cmdExportFile.args.value', 'The value to export')]],
    example: "-c 'search res.partner'",
  };
}
