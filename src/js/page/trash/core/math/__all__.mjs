// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import funcFloor from './floor';
import funcFixed from './fixed';
import funcRand from './rand';
import funcAbs from './abs';
import type VMachine from '@trash/vmachine';

export default function (vm: VMachine) {
  vm.registerCommand('floor', funcFloor());
  vm.registerCommand('fixed', funcFixed());
  vm.registerCommand('rand', funcRand());
  vm.registerCommand('abs', funcAbs());
}
