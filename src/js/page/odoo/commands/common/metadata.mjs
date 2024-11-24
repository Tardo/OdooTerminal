// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModelMulti from '@odoo/osv/call_model_multi';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import renderMetadata from '@odoo/templates/metadata';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';


async function cmdMetadata(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const metadata = (
    await callModelMulti<$ReadOnlyArray<OdooMetadataInfo>>(
      kwargs.model,
      [kwargs.id],
      'get_metadata',
      null,
      null,
      await this.getContext(),
    )
  )[0];

  if (typeof metadata === 'undefined') {
    ctx.screen.printError(i18n.t('cmdMetadata.error.notFound', "Can't found any metadata for the given id"));
  } else {
    ctx.screen.print(
      renderMetadata(
        metadata.create_uid,
        metadata.create_date,
        metadata.write_uid,
        metadata.write_date,
        metadata.noupdate,
        metadata.xmlid,
      ),
    );
  }
  return metadata;
}

async function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'model ASC'},
      item => item.model,
    );
  }
  return [];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdMetadata.definition', 'View record metadata'),
    callback: cmdMetadata,
    options: getOptions,
    detail: i18n.t('cmdMetadata.detail', 'View record metadata'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdMetadata.args.model', 'The record model')],
      [ARG.Number, ['i', 'id'], true, i18n.t('cmdMetadata.args.id', 'The record id')],
    ],
    example: '-m res.partner -i 1',
  };
}
