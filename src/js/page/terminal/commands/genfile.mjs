// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import file2file from '@terminal/utils/file2file';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdGenFile(this: Terminal, kwargs: CMDCallbackArgs): Promise<> {
  return file2file(kwargs.name, kwargs.options);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdGenFile.definition', 'Generate a File object'),
    callback: cmdGenFile,
    detail: i18n.t(
      'cmdGenFile.detail',
      'Open a browser file dialog and instanciates a File object with the content of the selected file',
    ),
    args: [
      [ARG.String, ['n', 'name'], false, i18n.t('cmdGenFile.args.name', 'The File object file name')],
      [ARG.Dictionary, ['o', 'options'], false, i18n.t('cmdGenFile.args.options', 'The File object options')],
    ],
    example: '-n unnecessaryName.png',
  };
}
