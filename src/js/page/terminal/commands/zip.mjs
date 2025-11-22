// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import createZip from '@terminal/utils/zip';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdZip(this: Terminal, kwargs: CMDCallbackArgs): Promise<> {
  return await createZip(kwargs.values, kwargs.options);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdZip.definition', 'Create zip file'),
    callback: cmdZip,
    detail: i18n.t('cmdZip.detail', 'To learn about the available options, check out the JSZip help: https://stuk.github.io/jszip'),
    args: [
      [ARG.List | ARG.Any, ['v', 'values'], true, i18n.t('cmdZip.args.values', 'Data to write (must be an array of tuples [filename, filedata, fileoptions])')],
      [ARG.Dict, ['o', 'options'], false, i18n.t('cmdZip.args.options', 'The options to apply to the zip file'), {type: 'blob'}],
    ],
    example: "-v [['phones.txt', '000123456\\n000789012\\n'], ['names.txt', 'Lucia\\nAlex\\n']]",
  };
}
