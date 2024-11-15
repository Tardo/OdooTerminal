// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import postMessage from '@common/utils/post_message';
import searchCount from '@odoo/orm/search_count';
import createRecord from '@odoo/orm/create_record';
import writeRecord from '@odoo/orm/write_record';
import Recordset from '@terminal/core/recordset.mjs';
import isEmpty from '@trash/utils/is_empty';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function copyModelRecords(this: Terminal, model: string, data: $ReadOnlyArray<OdooSearchRecord>) {
  const records_vals = data.map(item => {
    delete item.id;
    delete item.display_name;
    return item;
  });
  const result = await createRecord(model, records_vals, await this.getContext());
  const records = result.map((nid, index) => {
    return Object.assign({}, records_vals[index], {id: nid});
  });
  return Recordset.make(model, records);
}

async function mergeModelRecords(this: Terminal, model: string, data: $ReadOnlyArray<OdooSearchRecord>) {
  const records_vals = data.map(item => {
    delete item.display_name;
    return item;
  });
  const tasks = [];
  for (const vals of records_vals) {
    // $FlowFixMe
    const num_recs = await searchCount(model, [['id', '=', vals.id]], this.getContext());

    if (num_recs === 0) {
      delete vals.id;
      // $FlowFixMe
      tasks.push(createRecord(model, vals, this.getContext()));
    } else {
      // $FlowFixMe
      tasks.push(writeRecord(model, vals.id, vals, this.getContext()));
    }
  }
  const results = await Promise.all(tasks);
  results.forEach((item, index) => {
    // $FlowFixMe
    if (item.constructor === Number && !records_vals[index].id) {
      records_vals[index].id = item;
    }
  });

  return Recordset.make(model, records_vals);
}

function onMessagePasteDone(
  this: Terminal,
  ctx: CMDCallbackContext,
  // $FlowFixMe
  resolve: Object,
  // $FlowFixMe
  reject: Object,
  merge: boolean,
  no_questions: boolean,
  vals: {[string]: mixed},
): Promise<> {
  // This is necessary due to 'bound' function usage
  this.removeMessageListener(
    'ODOO_TERM_PASTE_DONE',
    onMessagePasteDone.bind(this, ctx.screen, resolve, reject, merge, no_questions, vals),
  );
  const msg_vals = vals.values;
  // $FlowFixMe
  if (isEmpty(msg_vals) || isEmpty(msg_vals.data)) {
    ctx.screen.printError(i18n.t('cmdPaste.error.noData', 'No data to copy!'));
    return resolve();
  }

  // $FlowFixMe
  const {type, data, model} = vals.values;
  const data_parsed = JSON.parse(data);
  if (type === 'model') {
    if (!model) {
      return reject(i18n.t('cmdPaste.error.invalidData', 'Invalid data to paste! No model defined'));
    }
    let prom = null;
    if (no_questions) {
      prom = Promise.resolve('y');
    } else {
      prom = ctx.screen.showQuestion(
        i18n.t('cmdPaste.question.continue', "This will modify the '{{model}}' model. Continue?", {model}),
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
  }

  return resolve(data_parsed);
}

function cmdPaste(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  return new Promise((resolve, reject) => {
    this.addMessageListener(
      'ODOO_TERM_PASTE_DONE',
      onMessagePasteDone.bind(this, ctx, resolve, reject, kwargs.merge, kwargs.yes),
    );
    postMessage('ODOO_TERM_PASTE', {});
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdPaste.definition', 'Pastes copied data'),
    callback: cmdPaste,
    detail: i18n.t('cmdPaste.detail', 'Paste model records or variables'),
    args: [
      [
        ARG.Flag,
        ['m', 'merge'],
        false,
        i18n.t('cmdPaste.args.merge', "Try to merge data (if the type is 'model')"),
        false,
      ],
      [ARG.Flag, ['y', 'yes'], false, i18n.t('cmdPaste.args.yes', "Don't show questions"), false],
    ],
    example: '--merge',
  };
}
