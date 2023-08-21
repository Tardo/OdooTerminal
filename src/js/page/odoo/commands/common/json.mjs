// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from '@odoo/rpc';
import {ARG} from '@trash/constants';

async function cmdPostJSONData(kwargs) {
  return rpc
    .query({
      route: kwargs.endpoint,
      params: kwargs.data,
    })
    .then(result => {
      this.screen.eprint(result, false, 'line-pre');
      return result;
    });
}

export default {
  definition: 'Send POST JSON',
  callback: cmdPostJSONData,
  detail: "Sends HTTP POST 'application/json' request",
  args: [
    [ARG.String, ['e', 'endpoint'], true, 'The endpoint'],
    [ARG.Any, ['d', 'data'], true, 'The data to send'],
  ],
  example: "-e /web_editor/public_render_template -d {args: ['web.layout']}",
};
