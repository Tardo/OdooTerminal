// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {renderMetadata} from "@terminal/core/template_manager";
import rpc from "@odoo/rpc";

function cmdMetadata(kwargs) {
  return new Promise(async (resolve, reject) => {
    let metadata = {};
    try {
      metadata = (
        await rpc.query({
          method: "get_metadata",
          model: kwargs.model,
          args: [[kwargs.id]],
          kwargs: {context: this.getContext()},
        })
      )[0];

      if (typeof metadata === "undefined") {
        this.screen.print("Can't found any metadata for the given id");
      } else {
        this.screen.print(renderMetadata(metadata));
      }
    } catch (err) {
      return reject(err);
    }
    return resolve(metadata);
  });
}

export default {
  definition: "View record metadata",
  callback: cmdMetadata,
  detail: "View record metadata",
  args: [
    [ARG.String, ["m", "model"], true, "The record model"],
    [ARG.Number, ["i", "id"], true, "The record id"],
  ],
  example: "-m res.partner -i 1",
};
