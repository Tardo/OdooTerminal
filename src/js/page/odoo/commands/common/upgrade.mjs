// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {searchModules} from "./__utils__";
import {ARG} from "@trash/constants";
import rpc from "@odoo/rpc";

function cmdUpgradeModule(kwargs) {
  return new Promise((resolve, reject) => {
    searchModules
      .bind(this)(kwargs.module)
      .then((result) => {
        if (result.length) {
          return rpc
            .query({
              method: "button_immediate_upgrade",
              model: "ir.module.module",
              args: [result.map((item) => item.id)],
            })
            .then(
              () => {
                this.screen.print(
                  `'${result.length}' modules successfully upgraded`
                );
                resolve(result[0]);
              },
              (res) => reject(res.message.data.message)
            );
        }
        reject(`'${kwargs.module}' modules doesn't exists`);
      });
  });
}

export default {
  definition: "Upgrade a module",
  callback: cmdUpgradeModule,
  detail: "Launch upgrade module process.",
  args: [
    [ARG.List | ARG.String, ["m", "module"], true, "The module technical name"],
  ],
  example: "-m contacts",
};
