// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import funcStrSplit from './str_split';
import funcStrUpper from './str_upper';
import funcStrLower from './str_lower';
import funcStrTrim from './str_trim';
import funcStrReplace from './str_replace';
import funcStrSlice from './str_slice';
import funcStrIncludes from './str_includes';
import funcStrStarts from './str_starts';
import funcStrEnds from './str_ends';
import type VMachine from '@trash/vmachine';

export default function (vm: VMachine) {
  vm.registerCommand('str_split', funcStrSplit());
  vm.registerCommand('str_upper', funcStrUpper());
  vm.registerCommand('str_lower', funcStrLower());
  vm.registerCommand('str_trim', funcStrTrim());
  vm.registerCommand('str_replace', funcStrReplace());
  vm.registerCommand('str_slice', funcStrSlice());
  vm.registerCommand('str_includes', funcStrIncludes());
  vm.registerCommand('str_starts', funcStrStarts());
  vm.registerCommand('str_ends', funcStrEnds());
}
