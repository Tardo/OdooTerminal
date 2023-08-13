// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {getOdooService} from "@odoo/utils";

function cmdNow(kwargs) {
  const time = getOdooService("web.time");
  let res = false;
  if (kwargs.type === "full") {
    if (kwargs.tz) {
      res = moment().format(time.getLangDatetimeFormat());
    } else {
      res = time.datetime_to_str(new Date());
    }
  } else if (kwargs.type === "date") {
    if (kwargs.tz) {
      res = moment().format(time.getLangDateFormat());
    } else {
      res = time.date_to_str(new Date());
    }
  } else if (kwargs.type === "time") {
    if (kwargs.tz) {
      res = moment().format(time.getLangTimeFormat());
    } else {
      res = time.time_to_str(new Date());
    }
  }

  this.screen.print(res);
  return Promise.resolve(res);
}

export default {
  definition: "Current time",
  callback: cmdNow,
  detail: "Prints the current time",
  args: [
    [
      ARG.String,
      ["t", "type"],
      false,
      "Date type",
      "full",
      ["full", "date", "time"],
    ],
    [ARG.Flag, ["tz", "tz"], false, "Use timezone", false],
  ],
  example: "-t time --tz",
};
