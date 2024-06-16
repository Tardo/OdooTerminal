// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import cmdAction from './action';
import cmdEffect from './effect';
import cmdLang from './lang';
import cmdSettings from './settings';
import cmdView from './view';
import type VMachine from '@trash/vmachine';

export default function (vm: VMachine) {
  vm.registerCommand('view', cmdView());
  vm.registerCommand('settings', cmdSettings());
  vm.registerCommand('lang', cmdLang());
  vm.registerCommand('action', cmdAction());
  vm.registerCommand('effect', cmdEffect());
}
