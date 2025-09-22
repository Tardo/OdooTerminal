// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import funcFetch from './fetch';
import type VMachine from '@trash/vmachine';

export default function (vm: VMachine) {
  vm.registerCommand('fetch', funcFetch());
}
