// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from '@odoo/rpc';
import Recordset from '@terminal/core/recordset';
import {ARG} from '@trash/constants';

async function cmdSearchModelRecord(kwargs) {
  const lines_total = this.screen._max_lines - 3;
  const fields = kwargs.field[0] === '*' ? false : kwargs.field;

  if (kwargs.more) {
    const buff = this._buffer[this.__meta.name];
    if (!buff || !buff.data.length) {
      throw new Error('There are no more results to print');
    }
    const sresult = buff.data.slice(0, lines_total);
    buff.data = buff.data.slice(lines_total);
    const recordset = Recordset.make(kwargs.model, sresult);
    this.screen.print(recordset);
    if (buff.data.length) {
      this.screen.printError(
        `<strong class='text-warning'>Result truncated to ${sresult.length} records!</strong> The query is too big to be displayed entirely.`,
      );
      const res = await this.screen.showQuestion(
        `There are still results to print (${buff.data.length} records). Show more?`,
        ['y', 'n'],
        'y',
      );
      if (res === 'y') {
        this.execute(`search -m ${buff.model} --more`, false, false);
      }
    }
    return recordset;
  }

  return rpc
    .query({
      method: 'search_read',
      domain: kwargs.domain,
      fields: fields,
      model: kwargs.model,
      limit: kwargs.limit,
      offset: kwargs.offset,
      orderBy: kwargs.order,
      kwargs: {context: this.getContext()},
    })
    .then(result => {
      const need_truncate =
        !this.__meta.silent && !kwargs.all && result.length > lines_total;
      let sresult = result;
      if (need_truncate) {
        this._buffer[this.__meta.name] = {
          model: kwargs.model,
          data: sresult.slice(lines_total),
        };
        sresult = sresult.slice(0, lines_total);
      }
      const recordset = Recordset.make(kwargs.model, sresult);
      this.screen.print(recordset);
      this.screen.print(`Records count: ${sresult.length}`);
      if (need_truncate) {
        this.screen.printError(
          `<strong class='text-warning'>Result truncated to ${sresult.length} records!</strong> The query is too big to be displayed entirely.`,
        );
        return this.screen
          .showQuestion(
            `There are still results to print (${
              this._buffer[this.__meta.name].data.length
            } records). Show more?`,
            ['y', 'n'],
            'y',
          )
          .then(quest_res => {
            if (quest_res === 'y') {
              this.execute(`search -m ${kwargs.model} --more`, false, false);
            }
            return recordset;
          });
      }
      return recordset;
    });
}

export default {
  definition: 'Search model record/s',
  callback: cmdSearchModelRecord,
  detail: 'Launch orm search query',
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [
      ARG.List | ARG.String,
      ['f', 'field'],
      false,
      "The field names to request<br/>Can use '*' to show all fields of the model",
      ['display_name'],
    ],
    [ARG.List | ARG.Any, ['d', 'domain'], false, 'The domain', []],
    [ARG.Number, ['l', 'limit'], false, 'The limit of records to request'],
    [
      ARG.Number,
      ['of', 'offset'],
      false,
      'The offset (from)<br/>Can be zero (no limit)',
    ],
    [
      ARG.String,
      ['o', 'order'],
      false,
      "The order<br/>A list of orders separated by comma (Example: 'age DESC, email')",
    ],
    [
      ARG.Flag,
      ['more', 'more'],
      false,
      'Flag to indicate that show more results',
    ],
    [ARG.Flag, ['all', 'all'], false, 'Show all records (not truncated)'],
  ],
  example: "-m res.partner -f * -l 100 -of 5 -o 'id DESC, name'",
};
