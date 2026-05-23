// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import postMessage from '@common/utils/post_message';
import searchCount from '@odoo/orm/search_count';
import createRecord from '@odoo/orm/create_record';
import writeRecord from '@odoo/orm/write_record';
// $FlowFixMe[untyped-import]
import Recordset from '@terminal/core/recordset.mjs';
import isEmpty from '@trash/utils/is_empty';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type {RecordDef} from '@terminal/core/recordset.mjs';
import type Terminal from '@terminal/terminal';
import type {MessageListenerData} from '@terminal/terminal';


// $FlowFixMe[value-as-type]
async function copyModelRecords(this: Terminal, model: string, data: $ReadOnlyArray<RecordDef>) {
  const records_vals = data.map(item => {
    // $FlowFixMe[cannot-write]
    delete item.id;
    // $FlowFixMe[prop-missing]
    delete item.display_name;
    return item;
  });
  // $FlowFixMe[incompatible-type]
  const result = await createRecord(model, records_vals, await this.getContext());
  const records = result.map((nid, index) => {
    return {
      ...records_vals[index],
      id: nid,
    };
  });
  // $FlowFixMe[incompatible-type]
  return Recordset.make(model, records);
}

// $FlowFixMe[value-as-type]
async function mergeModelRecords(this: Terminal, model: string, data: $ReadOnlyArray<RecordDef>) {
  const records_vals: Array<RecordDef> = data.map(item => {
    // $FlowFixMe[prop-missing]
    delete item.display_name;
    return item;
  });
  const tasks = [];
  for (const vals of records_vals) {
    // $FlowFixMe[incompatible-type]
    const num_recs = await searchCount(model, [['id', '=', vals.id]], await this.getContext());

    if (num_recs === 0) {
      // $FlowFixMe[cannot-write]
      delete vals.id;
      // $FlowFixMe[incompatible-type]
      tasks.push(createRecord(model, [vals], await this.getContext()));
    } else {
      // $FlowFixMe[incompatible-type]
      // $FlowFixMe[class-object-subtyping]
      tasks.push(writeRecord(model, [vals.id], vals, await this.getContext()));
    }
  }
  const results = await Promise.all(tasks);
  results.forEach((item, index) => {
    // $FlowFixMe[sketchy-null-number]
    if (typeof item === 'number' && !records_vals[index].id) {
      // $FlowFixMe[cannot-write]
      records_vals[index].id = item;
    }
  });

  // $FlowFixMe[incompatible-type]
  return Recordset.make(model, records_vals);
}

function onMessagePasteDone(
  this: Terminal,
  ctx: CMDCallbackContext,
  resolve: (mixed) => void,
  reject: (string) => void,
  merge: boolean,
  no_questions: boolean,
  values: MessageListenerData,
): Promise<> {
  // This is necessary due to 'bound' function usage
  this.removeMessageListener(
    'ODOO_TERM_PASTE_DONE',
    onMessagePasteDone.bind(this, ctx.screen, resolve, reject, merge, no_questions, values),
  );
  if (isEmpty(values) || isEmpty(values.data)) {
    ctx.screen.printError(i18n.t('cmdPaste.error.noData', 'No data to copy!'));
    // $FlowFixMe[incompatible-type]
    return resolve();
  }

  const {type, data, model} = values;
  // $FlowFixMe[incompatible-type]
  const data_parsed = JSON.parse(data);
  if (type === 'model') {
    // $FlowFixMe[sketchy-null-mixed]
    if (!model) {
      // $FlowFixMe[incompatible-type]
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
            // $FlowFixMe[incompatible-type]
            return mergeModelRecords.bind(this)(model, data_parsed);
          }
          // $FlowFixMe[incompatible-type]
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

  // $FlowFixMe[incompatible-type]
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
