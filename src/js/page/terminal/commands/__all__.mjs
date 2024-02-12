// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import cmdAlias from './alias';
import cmdChrono from './chrono';
import cmdClear from './clear';
import cmdContextTerm from './context_term';
import cmdDis from './dis';
import cmdExportFile from './exportfile';
import cmdExportVar from './exportvar';
import cmdGenFile from './genfile';
import cmdHelp from './help';
import cmdJobs from './jobs';
import cmdLoad from './load';
import cmdPrint from './print';
import cmdQuit from './quit';
import cmdRepeat from './repeat';
import cmdToggleTerm from './toggle_term';

export default function (TerminalObj) {
  TerminalObj.registerCommand('help', cmdHelp);
  TerminalObj.registerCommand('clear', cmdClear);
  TerminalObj.registerCommand('print', cmdPrint);
  TerminalObj.registerCommand('load', cmdLoad);
  TerminalObj.registerCommand('context_term', cmdContextTerm);
  TerminalObj.registerCommand('alias', cmdAlias);
  TerminalObj.registerCommand('quit', cmdQuit);
  TerminalObj.registerCommand('exportvar', cmdExportVar);
  TerminalObj.registerCommand('exportfile', cmdExportFile);
  TerminalObj.registerCommand('chrono', cmdChrono);
  TerminalObj.registerCommand('repeat', cmdRepeat);
  TerminalObj.registerCommand('jobs', cmdJobs);
  TerminalObj.registerCommand('toggle_term', cmdToggleTerm);
  TerminalObj.registerCommand('dis', cmdDis);
  TerminalObj.registerCommand('genfile', cmdGenFile);
}
