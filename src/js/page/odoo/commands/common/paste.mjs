// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from '@trash/constants';
import postMessage from '@common/utils/post_message';
import searchCount from '@odoo/orm/search_count';
import createRecord from '@odoo/orm/create_record';
import writeRecord from '@odoo/orm/write_record';
import Recordset from '@terminal/core/recordset.mjs';
import isEmpty from '@terminal/utils/is_empty';

async function copyModelRecords(model, data) {
  const records_vals = data.map(item => {
    delete item.id;
    delete item.display_name;
    return item;
  });
  const result = await createRecord(model, records_vals, this.getContext());
  const records = result.map((nid, index) => {
    return Object.assign({}, records_vals[index], {id: nid});
  });
  return Recordset.make(model, records);
}

async function mergeModelRecords(model, data) {
  const records_vals = data.map(item => {
    delete item.display_name;
    return item;
  });
  const tasks = [];
  for (const vals of records_vals) {
    const num_recs = await searchCount(
      model,
      [['id', '=', vals.id]],
      this.getContext(),
    );

    if (num_recs === 0) {
      delete vals.id;
      tasks.push(createRecord(model, vals, this.getContext()));
    } else {
      tasks.push(writeRecord(model, vals.id, vals, this.getContext()));
    }
  }
  const results = await Promise.all(tasks);
  results.forEach((item, index) => {
    if (item.constructor.name === 'Number' && !records_vals[index].id) {
      records_vals[index].id = item;
    }
  });

  return Recordset.make(model, records_vals);
}

function onMessagePasteDone(
  screen,
  resolve,
  reject,
  merge,
  no_questions,
  vals,
) {
  // This is necessary due to 'bound' function usage
  this.removeMessageListener(
    'ODOO_TERM_PASTE_DONE',
    onMessagePasteDone.bind(this, screen, resolve, reject, merge),
  );
  const msg_vals = vals.values;
  if (isEmpty(msg_vals) || isEmpty(msg_vals.data)) {
    screen.print('No data to copy!');
    return resolve();
  }

  const {type, data, model} = vals.values;
  const data_parsed = JSON.parse(data);
  if (type === 'model') {
    if (!model) {
      return reject('Invalid data to paste! No model defined');
    }
    let prom = null;
    if (no_questions) {
      prom = Promise.resolve('y');
    } else {
      prom = screen.showQuestion(
        `This will modify the '${model}' model. Continue?`,
        ['y', 'n'],
        'y',
      );
    }
    prom
      .then(res => {
        if (res === 'y') {
          if (merge) {
            return mergeModelRecords.bind(this)(model, data_parsed);
          }
          return copyModelRecords.bind(this)(model, data_parsed);
        }
      })
      .then(res => {
        return resolve(res);
      })
      .catch(err => {
        return reject(err);
      });
  } else {
    return resolve(data_parsed);
  }
}

function cmdPaste(kwargs, screen) {
  return new Promise((resolve, reject) => {
    this.addMessageListener(
      'ODOO_TERM_PASTE_DONE',
      onMessagePasteDone.bind(
        this,
        screen,
        resolve,
        reject,
        kwargs.merge,
        kwargs.yes,
      ),
    );
    postMessage('ODOO_TERM_PASTE');
  });
}

export default {
  definition: 'Pastes copied data',
  callback: cmdPaste,
  detail: 'Paste model records or variables',
  args: [
    [
      ARG.Flag,
      ['m', 'merge'],
      false,
      "Try to merge data (if the type is 'model')",
      false,
    ],
    [ARG.Flag, ['y', 'yes'], false, "Don't show questions", false],
  ],
  example: '--merge',
};
