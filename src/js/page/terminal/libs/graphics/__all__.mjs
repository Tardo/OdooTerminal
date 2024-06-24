// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import cmd2DCreateWindow from './2d_create_window';
import cmd2DDestroyWindow from './2d_destroy_window';
import cmd2DLine from './2d_line';
import cmd2DRect from './2d_rect';
import cmd2DClear from './2d_clear';
import type VMachine from '@trash/vmachine';

export default function (vm: VMachine) {
  vm.registerCommand('2d_create_window', cmd2DCreateWindow());
  vm.registerCommand('2d_destroy_window', cmd2DDestroyWindow());
  vm.registerCommand('2d_line', cmd2DLine());
  vm.registerCommand('2d_rect', cmd2DRect());
  vm.registerCommand('2d_clear', cmd2DClear());
}
