// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import funcDictKeys from './dict_keys';
import funcDictValues from './dict_values';
import funcDictEntries from './dict_entries';
import funcDictHas from './dict_has';
import funcDictGet from './dict_get';
import funcDictSet from './dict_set';
import funcDictRemove from './dict_remove';
import funcDictMerge from './dict_merge';
import funcDictClone from './dict_clone';
import funcDictSize from './dict_size';
import type VMachine from '@trash/vmachine';

export default function (vm: VMachine) {
  vm.registerCommand('dict_keys', funcDictKeys());
  vm.registerCommand('dict_values', funcDictValues());
  vm.registerCommand('dict_entries', funcDictEntries());
  vm.registerCommand('dict_has', funcDictHas());
  vm.registerCommand('dict_get', funcDictGet());
  vm.registerCommand('dict_set', funcDictSet());
  vm.registerCommand('dict_remove', funcDictRemove());
  vm.registerCommand('dict_merge', funcDictMerge());
  vm.registerCommand('dict_clone', funcDictClone());
  vm.registerCommand('dict_size', funcDictSize());
}
