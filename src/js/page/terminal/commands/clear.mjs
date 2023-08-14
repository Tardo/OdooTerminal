// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";

async function cmdClear(kwargs) {
  if (kwargs.section === "history") {
    this.cleanInputHistory();
  } else {
    this.screen.clean();
  }
}

export default {
  definition: "Clean terminal section",
  callback: cmdClear,
  detail: "Clean the selected section",
  args: [
    [
      ARG.String,
      ["s", "section"],
      false,
      "The section to clear<br/>- screen: Clean the screen<br/>- history: Clean the command history",
      "screen",
      ["screen", "history"],
    ],
  ],
  example: "-s history",
};
