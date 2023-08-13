// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {showEffect} from "@odoo/root";
import {getOdooService, getOdooVersionMajor} from "@odoo/utils";
import {isEmpty} from "@terminal/core/utils";

function cmdShowEffect(kwargs) {
  if (getOdooVersionMajor() < 15) {
    return Promise.reject("This command is only available in Odoo 15.0+");
  }
  if (isEmpty(kwargs.type)) {
    const registry = getOdooService("@web/core/registry").registry;
    const effects = registry.category("effects");
    this.screen.print("Available effects:");
    this.screen.print(effects.getEntries().map((item) => item[0]));
  } else {
    showEffect(kwargs.type, kwargs.options);
    return Promise.resolve();
  }
}

export default {
  definition: "Show effect",
  callback: cmdShowEffect,
  detail: "Show effect",
  args: [
    [ARG.String, ["t", "type"], false, "The type of the effect"],
    [ARG.Dictionary, ["o", "options"], false, "The extra options to use"],
  ],
  example: "-t rainbow_man -o {message: 'Hello world!'}",
};
