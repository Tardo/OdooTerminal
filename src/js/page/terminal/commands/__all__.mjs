// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import cmdHelp from "./help";
import cmdClear from "./clear";
import cmdPrint from "./print";
import cmdLoad from "./load";
import cmdContextTerm from "./context_term";
import cmdAlias from "./alias";
import cmdQuit from "./quit";
import cmdExportVar from "./exportvar";
import cmdExportFile from "./exportfile";
import cmdChrono from "./chrono";
import cmdRepeat from "./repeat";
import cmdJobs from "./jobs";
import cmdToggleTerm from "./toggle_term";
import cmdDis from "./dis";
import cmdGenFile from "./genfile";

export default function (TerminalObj) {
  TerminalObj.registerCommand("help", cmdHelp);
  TerminalObj.registerCommand("clear", cmdClear);
  TerminalObj.registerCommand("print", cmdPrint);
  TerminalObj.registerCommand("load", cmdLoad);
  TerminalObj.registerCommand("context_term", cmdContextTerm);
  TerminalObj.registerCommand("alias", cmdAlias);
  TerminalObj.registerCommand("quit", cmdQuit);
  TerminalObj.registerCommand("exportvar", cmdExportVar);
  TerminalObj.registerCommand("exportfile", cmdExportFile);
  TerminalObj.registerCommand("chrono", cmdChrono);
  TerminalObj.registerCommand("repeat", cmdRepeat);
  TerminalObj.registerCommand("jobs", cmdJobs);
  TerminalObj.registerCommand("toggle_term", cmdToggleTerm);
  TerminalObj.registerCommand("dis", cmdDis);
  TerminalObj.registerCommand("genfile", cmdGenFile);
}
