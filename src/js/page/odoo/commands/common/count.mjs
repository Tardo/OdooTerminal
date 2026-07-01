// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import searchCount from '@odoo/orm/search_count';
import {getModelOptions} from './__utils__';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdCount(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  return searchCount(kwargs.model, kwargs.domain, await this.getContext(), kwargs.options).then(result => {
    ctx.screen.print(i18n.t('cmdCount.result', 'Result: {{result}}', {result}));
    return result;
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdCount.definition', 'Gets number of records from the given model in the selected domain'),
    callback: cmdCount,
    options: getModelOptions,
    detail: i18n.t('cmdCount.detail', 'Gets number of records from the given model in the selected domain'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdCount.args.model', 'The model technical name')],
      [ARG.List | ARG.Any, ['d', 'domain'], false, i18n.t('cmdCount.args.domain', 'The domain'), []],
      [ARG.Dictionary, ['o', 'options'], false, i18n.t('cmdCount.args.options', 'The options')],
    ],
    example: '-m res.partner -d [["name", "=ilike", "A%"]]',
  };
}
