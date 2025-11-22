// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import save2file from '@terminal/utils/save2file';
import Recordset from '@terminal/core/recordset';
import csvStringify from '@terminal/utils/csv';
import replacer from '@terminal/utils/stringify_replacer';
import xmlStringify from '@odoo/net_utils/xml';
import uniqueId from '@trash/utils/unique_id';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdExportFile(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<string> {
  const filename = kwargs.filename ? kwargs.filename : `${uniqueId('term')}_${new Date().getTime()}.${kwargs.format}`;
  let mime = '';
  let data = '';
  const is_recordset = kwargs.value instanceof Recordset;
  if (kwargs.format === 'json') {
    mime = 'text/json';
    if (is_recordset) {
      data = JSON.stringify(kwargs.value.toJSON(), replacer, 4);
    } else {
      data = JSON.stringify(kwargs.value, replacer, 4);
    }
  } else if (kwargs.format === 'csv' || kwargs.format === 'xml') {
    if (!is_recordset) {
      throw new Error(i18n.t('cmdExportFile.invalidValue', 'Invalid value: must be a recordset with csv and xml'));
    }
    if (kwargs.format === 'csv') {
      mime = 'text/csv';
      data = csvStringify(kwargs.value.toJSON(), !kwargs.no_header, kwargs.delimiter);
    } else if (kwargs.format === 'xml') {
      mime = 'text/xml';
      data = await xmlStringify(kwargs.value, await this.getContext());
    }
  }
  save2file(filename, mime, data);
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
    args: [
      [ARG.Flag, ['no-header', 'no-header'], false, i18n.t('cmdExportFile.args.noHeader', "Don't use header"), false],
      [ARG.String, ['f', 'format'], false, i18n.t('cmdExportFile.args.format', 'The format to use for exporting'), 'json', ['json', 'csv', 'xml']],
      [ARG.String, ['fn', 'filename'], false, i18n.t('cmdExportFile.args.filename', 'The filename')],
      [ARG.String, ['d', 'delimiter'], false, i18n.t('cmdExportFile.args.delimiter', 'The delimiter'), ','],
      [ARG.Any, ['v', 'value'], true, i18n.t('cmdExportFile.args.value', 'The value to export')],
    ],
    example: "-c 'search res.partner'",
  };
}
