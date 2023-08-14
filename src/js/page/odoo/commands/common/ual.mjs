// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from "@odoo/rpc";

async function cmdUpdateAppList() {
  return rpc
    .query({
      method: "update_list",
      model: "ir.module.module",
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      if (result) {
        this.screen.print("The apps list has been updated successfully");
      } else {
        this.screen.printError("Can't update the apps list!");
      }
      return result;
    });
}

export default {
  definition: "Update apps list",
  callback: cmdUpdateAppList,
  detail: "Update apps list",
};
