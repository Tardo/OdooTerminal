// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import callModelMulti from '@odoo/osv/call_model_multi';
import {getModelOptions} from './__utils__';
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

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdMetadata.definition', 'View record metadata'),
    callback: cmdMetadata,
    options: getModelOptions,
    detail: i18n.t('cmdMetadata.detail', 'Show ORM metadata for a record: create_uid, create_date, write_uid, write_date, noupdate flag, and XML ID.'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdMetadata.args.model', 'The record model')],
      [ARG.Number, ['i', 'id'], true, i18n.t('cmdMetadata.args.id', 'The record id')],
    ],
    example: '-m res.partner -i 1',
  };
}
