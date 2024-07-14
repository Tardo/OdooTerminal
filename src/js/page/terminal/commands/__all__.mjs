// @flow strict
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
import cmdToggleTerm from './toggle_term';
import cmdInput from './input';
import type VMachine from '@trash/vmachine';

export default function (vm: VMachine) {
  vm.registerCommand('help', cmdHelp());
  vm.registerCommand('clear', cmdClear());
  vm.registerCommand('print', cmdPrint());
  vm.registerCommand('load', cmdLoad());
  vm.registerCommand('context_term', cmdContextTerm());
  vm.registerCommand('alias', cmdAlias());
  vm.registerCommand('quit', cmdQuit());
  vm.registerCommand('exportvar', cmdExportVar());
  vm.registerCommand('exportfile', cmdExportFile());
  vm.registerCommand('chrono', cmdChrono());
  vm.registerCommand('jobs', cmdJobs());
  vm.registerCommand('toggle_term', cmdToggleTerm());
  vm.registerCommand('dis', cmdDis());
  vm.registerCommand('genfile', cmdGenFile());
  vm.registerCommand('input', cmdInput());
}
