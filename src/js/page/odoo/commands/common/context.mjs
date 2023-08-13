// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {getOdooSession, getOdooVersionMajor} from "@odoo/utils";

const session = getOdooSession();

function cmdContextOperation(kwargs) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 15) {
    if (
      kwargs.operation === "set" ||
      kwargs.operation === "write" ||
      kwargs.operation === "delete"
    ) {
      this.screen.printError(
        "This operation is currently not supported in v15.0+"
      );
      return Promise.resolve();
    }
  }

  if (kwargs.operation === "set") {
    session.user_context = kwargs.value;
  } else if (kwargs.operation === "write") {
    Object.assign(session.user_context, kwargs.value);
  } else if (kwargs.operation === "delete") {
    if (Object.hasOwn(session.user_context, kwargs.value)) {
      delete session.user_context[kwargs.value];
    } else {
      return Promise.reject(
        "The selected key is not present in the terminal context"
      );
    }
  }
  this.screen.print(session.user_context);
  return Promise.resolve(session.user_context);
}

export default {
  definition: "Operations over session context dictionary",
  callback: cmdContextOperation,
  detail: "Operations over session context dictionary.",
  args: [
    [
      ARG.String,
      ["o", "operation"],
      false,
      "The operation to do",
      "read",
      ["read", "write", "set", "delete"],
    ],
    [ARG.Any, ["v", "value"], false, "The values"],
  ],
  example: "-o write -v {the_example: 1}",
};
