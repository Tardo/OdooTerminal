// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import searchRead from '@odoo/orm/search_read';
import getFieldsInfo from '@odoo/orm/get_fields_info';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {default as Recordset} from '@terminal/core/recordset';
import {ARG} from '@trash/constants';

const search_buffer = {};
async function cmdSearchModelRecord(kwargs, screen, meta) {
  const lines_total = screen.maxLines - 3;
  let fields = kwargs.field[0] === '*' ? false : kwargs.field;

  if (kwargs.more) {
    const buff = search_buffer[meta.name];
    if (!buff || !buff.data.length) {
      throw new Error(
        i18n.t(
          'cmdSearch.error.noMoreResults',
          'There are no more results to print',
        ),
      );
    }
    const sresult = buff.data.slice(0, lines_total);
    buff.data = buff.data.slice(lines_total);
    const recordset = Recordset.make(kwargs.model, sresult);
    screen.print(recordset);
    if (buff.data.length) {
      screen.printError(
        i18n.t(
          'cmdSearch.error.resultTruncated',
          "<strong class='text-warning'>Result truncated to {{len}} records!</strong> The query is too big to be displayed entirely.",
          {
            len: sresult.length,
          },
        ),
      );
      const res = await screen.showQuestion(
        i18n.t(
          'cmdSearch.question.showMore',
          'There are still results to print ({{len}} records). Show more?',
          {
            len: buff.data.length,
          },
        ),
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
      i18n.t(
        'cmdSearch.error.resultTruncated',
        "<strong class='text-warning'>Result truncated to {{len}} records!</strong> The query is too big to be displayed entirely.",
        {
          len: sresult.length,
        },
      ),
    );
    return screen
      .showQuestion(
        i18n.t(
          'cmdSearch.question.showMore',
          'There are still results to print ({{len}} records). Show more?',
          {
            len: search_buffer[meta.name].data.length,
          },
        ),
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

function getOptions(arg_name) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      this.getContext({active_test: true}),
      null,
      item => item.model,
    );
  }
  return Promise.resolve([]);
}

export default {
  definition: i18n.t('cmdSearch.definition', 'Search model record/s'),
  callback: cmdSearchModelRecord,
  options: getOptions,
  detail: i18n.t('cmdSearch.detail', 'Launch orm search query'),
  args: [
    [
      ARG.String,
      ['m', 'model'],
      true,
      i18n.t('cmdSearch.args.model', 'The model technical name'),
    ],
    [
      ARG.List | ARG.String,
      ['f', 'field'],
      false,
      i18n.t(
        'cmdSearch.args.field',
        "The field names to request<br/>Can use '*' to show all fields of the model",
      ),
      ['display_name'],
    ],
    [
      ARG.List | ARG.Any,
      ['d', 'domain'],
      false,
      i18n.t('cmdSearch.args.domain', 'The domain'),
      [],
    ],
    [
      ARG.Number,
      ['l', 'limit'],
      false,
      i18n.t('cmdSearch.args.limit', 'The limit of records to request'),
    ],
    [
      ARG.Number,
      ['of', 'offset'],
      false,
      i18n.t(
        'cmdSearch.args.offset',
        'The offset (from)<br/>Can be zero (no limit)',
      ),
    ],
    [
      ARG.String,
      ['o', 'order'],
      false,
      i18n.t(
        'cmdSearch.args.order',
        "The order<br/>A list of orders separated by comma (Example: 'age DESC, email')",
      ),
    ],
    [
      ARG.Flag,
      ['more', 'more'],
      false,
      i18n.t('cmdSearch.args.more', 'Flag to indicate that show more results'),
    ],
    [
      ARG.Flag,
      ['all', 'all'],
      false,
      i18n.t('cmdSearch.args.all', 'Show all records (not truncated)'),
    ],
    [
      ARG.Flag,
      ['rb', 'read-binary'],
      false,
      i18n.t('cmdSearch.args.readBinary', "Don't filter binary fields"),
    ],
  ],
  example: "-m res.partner -f * -l 100 -of 5 -o 'id DESC, name'",
};
