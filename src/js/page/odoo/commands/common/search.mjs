// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import searchRead from '@odoo/orm/search_read';
import getFieldsInfo from '@odoo/orm/get_fields_info';
import {default as Recordset} from '@terminal/core/recordset';
import {ARG} from '@trash/constants';

const search_buffer = {};
async function cmdSearchModelRecord(kwargs, screen, meta) {
  const lines_total = screen.maxLines - 3;
  let fields = kwargs.field[0] === '*' ? false : kwargs.field;

  if (kwargs.more) {
    const buff = search_buffer[meta.name];
    if (!buff || !buff.data.length) {
      throw new Error('There are no more results to print');
    }
    const sresult = buff.data.slice(0, lines_total);
    buff.data = buff.data.slice(lines_total);
    const recordset = Recordset.make(kwargs.model, sresult);
    screen.print(recordset);
    if (buff.data.length) {
      screen.printError(
        `<strong class='text-warning'>Result truncated to ${sresult.length} records!</strong> The query is too big to be displayed entirely.`,
      );
      const res = await screen.showQuestion(
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

  // Due to possible problems with binary fields it is necessary to filter them out
  const bin_fields = [];
  if (!fields && !kwargs.read_binary) {
    const fieldDefs = await getFieldsInfo(
      kwargs.model,
      fields,
      this.getContext(),
    );

    fields = [];
    Object.entries(fieldDefs).forEach(item => {
      if (item[1].type === 'binary') {
        bin_fields.push(item[0]);
      } else {
        fields.push(item[0]);
      }
    });
  }

  const result = await searchRead(
    kwargs.model,
    kwargs.domain,
    fields,
    this.getContext(),
    {
      limit: kwargs.limit,
      offset: kwargs.offset,
      orderBy: kwargs.order,
    },
  );

  if (bin_fields.length !== 0) {
    for (const item of result) {
      for (const bin_field of bin_fields) {
        item[bin_field] = {oterm: true, binary: true};
      }
    }
  }

  const need_truncate =
    !meta.silent && !kwargs.all && result.length > lines_total;
  let sresult = result;
  if (need_truncate) {
    search_buffer[meta.name] = {
      model: kwargs.model,
      data: sresult.slice(lines_total),
    };
    sresult = sresult.slice(0, lines_total);
  }
  const recordset = Recordset.make(kwargs.model, sresult);
  screen.print(recordset);
  screen.print(`Records count: ${sresult.length}`);
  if (need_truncate) {
    screen.printError(
      `<strong class='text-warning'>Result truncated to ${sresult.length} records!</strong> The query is too big to be displayed entirely.`,
    );
    return screen
      .showQuestion(
        `There are still results to print (${
          search_buffer[meta.name].data.length
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
    [ARG.Flag, ['rb', 'read-binary'], false, "Don't filter binary fields"],
  ],
  example: "-m res.partner -f * -l 100 -of 5 -o 'id DESC, name'",
};
