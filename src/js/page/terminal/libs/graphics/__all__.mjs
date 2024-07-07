// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import func2DCreateWindow from './2d_create_window';
import funcDDestroyWindow from './2d_destroy_window';
import func2DLine from './2d_line';
import func2DRect from './2d_rect';
import func2DClear from './2d_clear';
import func2DText from './2d_text';
import type VMachine from '@trash/vmachine';

export default function (vm: VMachine) {
  vm.registerCommand('2d_create_window', func2DCreateWindow());
  vm.registerCommand('2d_destroy_window', funcDDestroyWindow());
  vm.registerCommand('2d_line', func2DLine());
  vm.registerCommand('2d_rect', func2DRect());
  vm.registerCommand('2d_clear', func2DClear());
  vm.registerCommand('2d_text', func2DText());
}
