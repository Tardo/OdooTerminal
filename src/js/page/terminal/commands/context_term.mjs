// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";

function cmdTerminalContextOperation(kwargs) {
  if (kwargs.operation === "set") {
    this.userContext = kwargs.value;
  } else if (kwargs.operation === "write") {
    Object.assign(this.userContext, kwargs.value);
  } else if (kwargs.operation === "delete") {
    if (Object.hasOwn(this.userContext, kwargs.value)) {
      delete this.userContext[kwargs.value];
    } else {
      return Promise.reject(
        "The selected key is not present in the terminal context"
      );
    }
  }
  this.screen.print(this.userContext);
  return Promise.resolve(this.userContext);
}

export default {
  definition: "Operations over terminal context dictionary",
  callback: cmdTerminalContextOperation,
  detail:
    "Operations over terminal context dictionary. " +
    "This context only affects to the terminal operations.",
  args: [
    [
      ARG.String,
      ["o", "operation"],
      false,
      "The operation to do",
      "read",
      ["read", "write", "set", "delete"],
    ],
    [ARG.Any, ["v", "value"], false, "The value"],
  ],
  example: "-o write -v {the_example: 1}",
};
