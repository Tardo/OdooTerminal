// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from "@odoo/rpc";
import {ARG} from "@trash/constants";

async function cmdUserHasGroups(kwargs) {
  return rpc
    .query({
      method: "user_has_groups",
      model: "res.users",
      args: [kwargs.group.join(",")],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      this.screen.print(result);
      return result;
    });
}

export default {
  definition: "Check if user is in the selected groups",
  callback: cmdUserHasGroups,
  detail: "Check if user is in the selected groups.",
  args: [
    [
      ARG.List | ARG.String,
      ["g", "group"],
      true,
      "The technical name of the group<br/>A group can be optionally preceded by '!' to say 'is not in group'",
    ],
  ],
  example: "-g base.group_user",
};
