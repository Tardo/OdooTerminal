// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooService from '@odoo/utils/get_odoo_service';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdPostData(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (kwargs.mode === 'odoo') {
    const ajax = getOdooService('web.ajax');
    if (ajax) {
      return ajax.post(kwargs.endpoint, kwargs.data).then(result => {
        ctx.screen.eprint(result, false, 'line-pre');
        return result;
      });
    }
    // $FlowIgnore
    return $.post(kwargs.endpoint, Object.assign({}, kwargs.data, {csrf_token: odoo.csrf_token}), (result: mixed) => {
      ctx.screen.eprint(result, false, 'line-pre');
      return result;
    });
  }
  // $FlowIgnore
  return $.post(kwargs.endpoint, kwargs.data, (result: mixed) => {
    ctx.screen.eprint(result, false, 'line-pre');
    return result;
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdPost.definition', 'Send POST request'),
    callback: cmdPostData,
    detail: i18n.t('cmdPost.detail', 'Send POST request to selected endpoint'),
    args: [
      [ARG.String, ['e', 'endpoint'], true, i18n.t('cmdPost.args.endpoit', 'The endpoint')],
      [ARG.Any, ['d', 'data'], true, i18n.t('cmdPost.args.data', 'The data')],
      [ARG.String, ['m', 'mode'], false, i18n.t('cmdPost.args.mode', 'The mode'), 'odoo', ['odoo', 'raw']],
    ],
    example: '-e /web/endpoint -d {the_example: 42}',
  };
}
