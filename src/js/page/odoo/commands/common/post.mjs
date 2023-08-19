// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import getOdooService from "@odoo/utils/get_odoo_service";

async function cmdPostData(kwargs) {
  if (kwargs.mode === "odoo") {
    return getOdooService("web.ajax")
      .post(kwargs.endpoint, kwargs.data)
      .then((result) => {
        this.screen.eprint(result, false, "line-pre");
        return result;
      });
  }
  return $.post(kwargs.endpoint, kwargs.data, (result) => {
    this.screen.eprint(result, false, "line-pre");
    return result;
  });
}

export default {
  definition: "Send POST request",
  callback: cmdPostData,
  detail: "Send POST request to selected endpoint",
  args: [
    [ARG.String, ["e", "endpoint"], true, "The endpoint"],
    [ARG.Any, ["d", "data"], true, "The data"],
    [ARG.String, ["m", "mode"], false, "The mode", "odoo", ["odoo", "raw"]],
  ],
  example: "-e /web/endpoint -d {the_example: 42}",
};
