// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
// $FlowIgnore
import JSZip from 'jszip';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdZip(this: Terminal, kwargs: CMDCallbackArgs): Promise<> {
  const zip = new JSZip();
  for (const [filename, data] of kwargs.values) {
    zip.file(filename, data);
  }
  return await zip.generateAsync({type: 'blob'});
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdZip.definition', 'Create zip file'),
    callback: cmdZip,
    detail: i18n.t('cmdZip.detail', 'Create zip file'),
    args: [
      [ARG.List | ARG.Any, ['v', 'values'], true, i18n.t('cmdZip.args.values', 'Data to write (must be an array of tuples [filename, filedata])')],
    ],
    example: "-v [['phones.txt', '000123456\\n000789012\\n'], ['names.txt', 'Lucia\\nAlex\\n']]",
  };
}
