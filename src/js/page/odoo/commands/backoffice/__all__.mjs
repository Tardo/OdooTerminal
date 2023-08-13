// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import cmdView from "./view";
import cmdSettings from "./settings";
import cmdLang from "./lang";
import cmdAction from "./action";
import cmdEffect from "./effect";

export default function (TerminalObj) {
  TerminalObj.registerCommand("view", cmdView);
  TerminalObj.registerCommand("settings", cmdSettings);
  TerminalObj.registerCommand("lang", cmdLang);
  TerminalObj.registerCommand("action", cmdAction);
  TerminalObj.registerCommand("effect", cmdEffect);
}
