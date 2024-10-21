// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import createRecord from '@odoo/orm/create_record';
import searchRead from '@odoo/orm/search_read';
import callModelMulti from '@odoo/osv/call_model_multi';
import callModel from '@odoo/osv/call_model';
import getContent from '@odoo/utils/get_content';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import file2base64 from '@terminal/utils/file2base64';
import isEmpty from '@trash/utils/is_empty';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdLang(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
  const filtered_kwargs = Object.fromEntries(
    Object.entries(kwargs).filter(([key]) => key !== 'operation' || key !== 'format'),
  );
  const is_empty_args = isEmpty(filtered_kwargs);
  if (kwargs.operation === 'export') {
    if (is_empty_args) {
      return doAction('base.action_wizard_lang_export');
    }
    if (!kwargs.lang || !kwargs.format || isEmpty(kwargs.module)) {
      throw new Error(
        i18n.t(
          'cmdLang.error.exportInvalidArguments',
          "'export' operation needs the following arguments: --lang, --format, --module",
        ),
      );
    }
    // Get module ids
    const modules = await searchRead('ir.module.module', [['name', 'in', kwargs.module]], ['id'], await this.getContext());
    const module_ids = modules.map(item => item.id);
    if (isEmpty(module_ids)) {
      throw new Error(i18n.t('cmdLang.error.noModulesFound', 'No modules found!'));
    }
    // Create wizard record
    const wizard_id = (
      await createRecord(
        'base.language.export',
        [
          {
            state: 'choose',
            format: kwargs.format,
            lang: kwargs.lang,
            modules: [[6, false, module_ids]],
          },
        ],
        await this.getContext(),
      )
    )[0];
    if (!wizard_id) {
      throw new Error(i18n.t('cmdLang.error.noWizard', "Can't create wizard record!"));
    }

    // Get action to export
    await callModelMulti<void>('base.language.export', [wizard_id], 'act_getfile', null, null, await this.getContext());

    // Get updated wizard record data
    const wizard_record = (
      await searchRead('base.language.export', [['id', '=', wizard_id]], false, await this.getContext())
    )[0];

    // Get file
    const content_def = getContent(
      {
        model: 'base.language.export',
        id: wizard_id,
        field: 'data',
        filename_field: 'name',
        filename: wizard_record.name || '',
      },
      ctx.screen.printError,
    );

    return content_def;
  } else if (kwargs.operation === 'import') {
    if (is_empty_args) {
      return doAction('base.action_view_base_import_language');
    }
    if (!kwargs.name || !kwargs.lang || !kwargs.format || isEmpty(kwargs.module)) {
      throw new Error(
        i18n.t(
          'cmdLang.error.importInvalidArguments',
          "'import' operation needs the following arguments: --name, --lang, --format, --module",
        ),
      );
    }
    // Get file content
    const file64 = await file2base64();

    // Create wizard record
    const wizard_id = (
      await createRecord(
        'base.language.import',
        [
          {
            name: kwargs.name,
            code: kwargs.lang,
            filename: `${kwargs.lang}.${kwargs.format}`,
            overwrite: !kwargs.no_overwrite,
            data: file64,
          },
        ],
        await this.getContext(),
      )
    )[0];
    if (!wizard_id) {
      throw new Error(i18n.t('cmdLang.error.noWizard', "Can't create wizard record!"));
    }

    // Get action to export
    const status: boolean = await callModelMulti<boolean>(
      'base.language.import',
      [wizard_id],
      'import_lang',
      null,
      null,
      await this.getContext(),
    );
    if (status) {
      ctx.screen.print(i18n.t('cmdLang.result.success', 'Language file imported successfully'));
    }
    return status;
  } else if (kwargs.operation === 'list') {
    const langs: $ReadOnlyArray<[string, string]> = await callModel(
      'res.lang',
      'get_installed',
      null,
      null,
      await this.getContext(),
    );
    for (const lang of langs) {
      ctx.screen.print(` - ${lang[0]} (${lang[1]})`);
    }
    return langs;
  }
  throw new Error(i18n.t('cmdLang.error.invalidOperation', 'Invalid operation!'));
}

async function getOptions(this: Terminal, arg_name: string): Promise<Array<string>> {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'name ASC'},
      item => item.name,
    );
  } else if (arg_name === 'lang') {
    return cachedSearchRead(
      'options_res.lang_active',
      'res.lang',
      [],
      ['code'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'code ASC'},
      item => item.code,
    );
  }
  return [];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdLang.definition', 'Operations over translations'),
    callback: cmdLang,
    options: getOptions,
    detail: i18n.t('cmdLang.detail', 'Operations over translations.'),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        true,
        i18n.t('cmdLang.args.operation', 'The operation'),
        'export',
        ['export', 'import', 'list'],
      ],
      [
        ARG.String,
        ['l', 'lang'],
        false,
        i18n.t('cmdLang.args.lang', "The language<br/>Can use '__new__' for new language (empty translation template)"),
      ],
      [ARG.List | ARG.String, ['m', 'module'], false, i18n.t('cmdLang.args.module', 'The technical module name')],
      [ARG.String, ['f', 'format'], false, i18n.t('cmdLang.args.format', 'The format to use'), 'po', ['po', 'csv']],
      [ARG.String, ['n', 'name'], false, i18n.t('cmdLang.args.name', 'The language name')],
      [
        ARG.Flag,
        ['no', 'no-overwrite'],
        false,
        i18n.t('cmdLang.args.noOverwrite', "Flag to indicate don't overwrite current translations"),
      ],
    ],
    example: '-o export -l en_US -m mail',
  };
}
