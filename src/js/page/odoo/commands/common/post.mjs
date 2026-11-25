// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import getOdooService from '@odoo/utils/get_odoo_service';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';

async function cmdPostData(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (kwargs.mode === 'odoo') {
    const ajax = getOdooService('web.ajax');
    if (ajax) {
      return ajax.post(kwargs.endpoint, kwargs.data).then(result => {
        ctx.screen.eprint(result, false, 'line-pre');
        return result;
      });
    }
    return postForm(kwargs.endpoint, {...kwargs.data, csrf_token: odoo.csrf_token}, ctx);
  }
  return postForm(kwargs.endpoint, kwargs.data, ctx);
}

// Same as jQuery.post (form-urlencoded) without jQuery (removed in Odoo 20)
async function postForm(endpoint: string, data: {[string]: mixed}, ctx: CMDCallbackContext): Promise<mixed> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data || {})) {
    body.append(key, typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value));
  }
  const response = await fetch(endpoint, {method: 'POST', body});
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  let result: mixed = text;
  try {
    result = JSON.parse(text);
  } catch (_err) {
    // not json
  }
  ctx.screen.eprint(result, false, 'line-pre');
  return result;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdPost.definition', 'Send POST request'),
    category: 'system',
    callback: cmdPostData,
    unsafe: true,
    detail: i18n.t('cmdPost.detail', 'Send POST request to selected endpoint'),
    args: [
      [ARG.String, ['e', 'endpoint'], true, i18n.t('cmdPost.args.endpoit', 'The endpoint')],
      [ARG.Any, ['d', 'data'], true, i18n.t('cmdPost.args.data', 'The data')],
      [ARG.String, ['m', 'mode'], false, i18n.t('cmdPost.args.mode', 'The mode'), 'odoo', ['odoo', 'raw']],
    ],
    example: '-e "/web/endpoint" -d {the_example: 42}',
  };
}
