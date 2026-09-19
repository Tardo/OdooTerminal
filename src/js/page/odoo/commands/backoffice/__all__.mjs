// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import cmdAction from './action';
import cmdEffect from './effect';
import cmdForm from './form';
import cmdGraph from './graph';
import cmdLang from './lang';
import cmdPivot from './pivot';
import cmdSettings from './settings';
import cmdView from './view';
import cmdDoc from './doc';
import type VMachine from '@tardo/trash/vmachine';

export default function (vm: VMachine) {
  vm.registerCommand('view', cmdView());
  vm.registerCommand('settings', cmdSettings());
  vm.registerCommand('lang', cmdLang());
  vm.registerCommand('action', cmdAction());
  vm.registerCommand('effect', cmdEffect());
  vm.registerCommand('doc', cmdDoc());
  vm.registerCommand('form', cmdForm());
  vm.registerCommand('graph', cmdGraph());
  vm.registerCommand('pivot', cmdPivot());
}
