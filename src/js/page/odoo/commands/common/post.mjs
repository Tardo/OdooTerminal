// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from '@odoo/utils/get_odoo_service';
import {ARG} from '@trash/constants';

async function cmdPostData(kwargs, screen) {
  if (kwargs.mode === 'odoo') {
    const ajax = getOdooService('web.ajax');
    if (ajax) {
      return ajax.post(kwargs.endpoint, kwargs.data).then(result => {
        screen.eprint(result, false, 'line-pre');
        return result;
      });
    }
    return $.post(
      kwargs.endpoint,
      Object.assign({}, kwargs.data, {csrf_token: odoo.csrf_token}),
      result => {
        screen.eprint(result, false, 'line-pre');
        return result;
      },
    );
  }
  return $.post(kwargs.endpoint, kwargs.data, result => {
    screen.eprint(result, false, 'line-pre');
    return result;
  });
}

export default {
  definition: 'Send POST request',
  callback: cmdPostData,
  detail: 'Send POST request to selected endpoint',
  args: [
    [ARG.String, ['e', 'endpoint'], true, 'The endpoint'],
    [ARG.Any, ['d', 'data'], true, 'The data'],
    [ARG.String, ['m', 'mode'], false, 'The mode', 'odoo', ['odoo', 'raw']],
  ],
  example: '-e /web/endpoint -d {the_example: 42}',
};
