// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {searchModules} from "./__utils__";
import {ARG} from "@trash/constants";
import {isEmpty} from "@terminal/core/utils";
import rpc from "@odoo/rpc";

function cmdUninstallModule(kwargs) {
  return new Promise(async (resolve, reject) => {
    try {
      const modue_infos = await searchModules.bind(this)(kwargs.module);
      if (!isEmpty(modue_infos)) {
        if (!kwargs.force) {
          let depends = await this.execute(
            `depends -m ${kwargs.module}`,
            false,
            true
          );
          if (isEmpty(depends)) {
            return resolve();
          }
          depends = depends.filter((item) => item !== kwargs.module);
          if (!isEmpty(depends)) {
            this.screen.print("This operation will remove these modules too:");
            this.screen.print(depends);
            const res = await this.screen.showQuestion(
              "Do you want to continue?",
              ["y", "n"],
              "n"
            );
            if (res?.toLowerCase() !== "y") {
              this.screen.printError("Operation cancelled");
              return resolve(false);
            }
          }
        }

        await rpc.query({
          method: "button_immediate_uninstall",
          model: "ir.module.module",
          args: [modue_infos[0].id],
        });

        this.screen.print(
          `'${kwargs.module}' (${modue_infos[0].display_name}) module successfully uninstalled`
        );
        return resolve(modue_infos[0]);
      }
    } catch (err) {
      return reject(err);
    }
    return reject(`'${kwargs.module}' module doesn't exists`);
  });
}

export default {
  definition: "Uninstall a module",
  callback: cmdUninstallModule,
  detail: "Launch module deletion process.",
  args: [
    [ARG.String, ["m", "module"], true, "The module technical name"],
    [ARG.Flag, ["f", "force"], false, "Forced mode"],
  ],
  exmaple: "-m contacts",
};
