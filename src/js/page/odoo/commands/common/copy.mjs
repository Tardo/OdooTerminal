// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from '@trash/constants';
import postMessage from '@common/utils/post_message';
import Recordset from '@terminal/core/recordset.mjs';

function onMessageCopyDone(resolve, data) {
  // This is necessary due to 'bound' function usage
  this.removeMessageListener(
    'ODOO_TERM_COPY_DONE',
    onMessageCopyDone.bind(this, resolve),
  );
  this.screen.print('Data copied!');
  resolve(data.values);
}

function cmdCopy(kwargs) {
  return new Promise(resolve => {
    const vals = {
      type: 'var',
      data: JSON.stringify(kwargs.data),
    };

    if (kwargs.type === 'auto' && kwargs.data instanceof Recordset) {
      Object.assign(vals, {
        type: 'model',
        model: kwargs.data.model,
      });
    }
    this.addMessageListener(
      'ODOO_TERM_COPY_DONE',
      onMessageCopyDone.bind(this, resolve),
    );
    postMessage({
      type: 'ODOO_TERM_COPY',
      values: vals,
      rid: new Date().getTime(), // FIXME: Not the best way to define an ID, but simple.
    });
  });
}

export default {
  definition: 'Copy data to paste them into other instances',
  callback: cmdCopy,
  detail: 'Copy model records or variables',
  args: [
    [ARG.Any, ['d', 'data'], true, 'The data'],
    [
      ARG.String,
      ['t', 'type'],
      false,
      'The type of data',
      'auto',
      ['auto', 'var'],
    ],
  ],
  example: '-t model -d $(search res.partner -f *)',
};
