// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import postMessage from '@common/utils/post_message';
import Recordset from '@terminal/core/recordset.mjs';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

function onMessageCopyDone(
  this: Terminal,
  // $FlowFixMe
  resolve: Object,
  ctx: CMDCallbackContext,
  data: {[string]: mixed},
): Promise<> {
  // This is necessary due to 'bound' function usage
  this.removeMessageListener('ODOO_TERM_COPY_DONE', onMessageCopyDone.bind(this, resolve, ctx));
  ctx.screen.print(i18n.t('cmdCopy.result.dateCopied', 'Data copied!'));
  return resolve(data.values);
}

function cmdCopy(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<> {
  return new Promise(resolve => {
    const vals: {[string]: string} = {
      type: 'var',
      data: JSON.stringify(kwargs.data),
    };

    if (kwargs.type === 'auto' && kwargs.data instanceof Recordset) {
      Object.assign(vals, {
        type: 'model',
        model: kwargs.data.model,
      });
    }
    this.addMessageListener('ODOO_TERM_COPY_DONE', onMessageCopyDone.bind(this, resolve, ctx));
    postMessage('ODOO_TERM_COPY', {
      values: vals,
    });
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdCopy.definition', 'Copy data to paste them into other instances'),
    callback: cmdCopy,
    detail: i18n.t('cmdCopy.detail', 'Copy model records or variables'),
    args: [
      [ARG.Any, ['d', 'data'], true, i18n.t('cmdCopy.args.data', 'The data')],
      [ARG.String, ['t', 'type'], false, i18n.t('cmdCopy.args.type', 'The type of data'), 'auto', ['auto', 'var']],
    ],
    example: '-t model -d (search res.partner -f *)',
  };
}
