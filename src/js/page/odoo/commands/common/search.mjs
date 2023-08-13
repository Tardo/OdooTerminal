// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import Recordset from "@terminal/core/recordset";
import rpc from "@odoo/rpc";

function cmdSearchModelRecord(kwargs) {
  const lines_total = this.screen._max_lines - 3;
  const fields = kwargs.field[0] === "*" ? false : kwargs.field;

  if (kwargs.more) {
    const buff = this._buffer[this.__meta.name];
    if (!buff || !buff.data.length) {
      return Promise.reject("There are no more results to print");
    }
    const sresult = buff.data.slice(0, lines_total);
    buff.data = buff.data.slice(lines_total);
    this.screen.printRecords(buff.model, sresult);
    if (buff.data.length) {
      this.screen.printError(
        `<strong class='text-warning'>Result truncated to ${sresult.length} records!</strong> The query is too big to be displayed entirely.`
      );
      return new Promise(async (resolve, reject) => {
        try {
          const res = await this.screen.showQuestion(
            `There are still results to print (${buff.data.length} records). Show more?`,
            ["y", "n"],
            "y"
          );
          if (res === "y") {
            this.execute(`search -m ${buff.model} --more`, false, false);
          }
        } catch (err) {
          return reject(err);
        }
        return resolve(sresult);
      });
    }
    return Promise.resolve(sresult);
  }

  return rpc
    .query({
      method: "search_read",
      domain: kwargs.domain,
      fields: fields,
      model: kwargs.model,
      limit: kwargs.limit,
      offset: kwargs.offset,
      orderBy: kwargs.order,
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
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
      this.screen.printRecords(kwargs.model, sresult);
      this.screen.print(`Records count: ${result.length}`);
      if (need_truncate) {
        this.screen.printError(
          `<strong class='text-warning'>Result truncated to ${sresult.length} records!</strong> The query is too big to be displayed entirely.`
        );
        return new Promise(async (resolve, reject) => {
          try {
            const res = await this.screen.showQuestion(
              `There are still results to print (${
                this._buffer[this.__meta.name].data.length
              } records). Show more?`,
              ["y", "n"],
              "y"
            );
            if (res === "y") {
              this.execute(`search -m ${kwargs.model} --more`, false, false);
            }
          } catch (err) {
            return reject(err);
          }
          return resolve(Recordset.make(kwargs.model, sresult));
        });
      }
      return Recordset.make(kwargs.model, result);
    });
}

export default {
  definition: "Search model record/s",
  callback: cmdSearchModelRecord,
  detail: "Launch orm search query",
  args: [
    [ARG.String, ["m", "model"], true, "The model technical name"],
    [
      ARG.List | ARG.String,
      ["f", "field"],
      false,
      "The field names to request<br/>Can use '*' to show all fields of the model",
      ["display_name"],
    ],
    [ARG.List | ARG.Any, ["d", "domain"], false, "The domain", []],
    [ARG.Number, ["l", "limit"], false, "The limit of records to request"],
    [
      ARG.Number,
      ["of", "offset"],
      false,
      "The offset (from)<br/>Can be zero (no limit)",
    ],
    [
      ARG.String,
      ["o", "order"],
      false,
      "The order<br/>A list of orders separated by comma (Example: 'age DESC, email')",
    ],
    [
      ARG.Flag,
      ["more", "more"],
      false,
      "Flag to indicate that show more results",
    ],
    [ARG.Flag, ["all", "all"], false, "Show all records (not truncated)"],
  ],
  example: "-m res.partner -f * -l 100 -of 5 -o 'id DESC, name'",
};
