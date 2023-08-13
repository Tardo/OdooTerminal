// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";

function cmdSetDebugMode(kwargs) {
  if (kwargs.mode === 0) {
    this.screen.print(
      "Debug mode <strong>disabled</strong>. Reloading page..."
    );
    const qs = $.deparam.querystring();
    delete qs.debug;
    window.location.search = "?" + $.param(qs);
  } else if (kwargs.mode === 1) {
    this.screen.print("Debug mode <strong>enabled</strong>. Reloading page...");
    window.location = $.param.querystring(window.location.href, "debug=1");
  } else if (kwargs.mode === 2) {
    this.screen.print(
      "Debug mode with assets <strong>enabled</strong>. " + "Reloading page..."
    );
    window.location = $.param.querystring(window.location.href, "debug=assets");
  } else {
    return Promise.reject("Invalid debug mode");
  }
  return Promise.resolve();
}

export default {
  definition: "Set debug mode",
  callback: cmdSetDebugMode,
  detail: "Set debug mode",
  args: [
    [
      ARG.Number,
      ["m", "mode"],
      true,
      "The mode<br>- 0: Disabled<br>- 1: Enabled<br>- 2: Enabled with Assets",
      undefined,
      [0, 1, 2],
    ],
  ],
  example: "-m 2",
};
