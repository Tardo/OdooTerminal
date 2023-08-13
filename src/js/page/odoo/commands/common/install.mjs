// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {searchModules} from "./__utils__";
import {ARG} from "@trash/constants";
import rpc from "@odoo/rpc";

function cmdInstallModule(kwargs) {
  return new Promise((resolve, reject) => {
    searchModules
      .bind(this)(kwargs.module)
      .then((result) => {
        if (result.length) {
          return rpc
            .query({
              method: "button_immediate_install",
              model: "ir.module.module",
              args: [result.map((item) => item.id)],
            })
            .then(
              () => {
                this.screen.print(
                  `'${result.length}' modules successfully installed`
                );
                resolve(result);
              },
              (res) => reject(res.message.data.message)
            );
        }
        return reject(`'${kwargs.module}' modules doesn't exists`);
      });
  });
}

export default {
  definition: "Install a module",
  callback: cmdInstallModule,
  detail: "Launch module installation process.",
  args: [
    [ARG.List | ARG.String, ["m", "module"], true, "The module technical name"],
  ],
  example: "-m contacts",
};
