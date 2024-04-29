// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import cmdAction from './action';
import cmdEffect from './effect';
import cmdLang from './lang';
import cmdSettings from './settings';
import cmdView from './view';
import type Terminal from '@terminal/terminal';

export default function (TerminalObj: Terminal) {
  TerminalObj.registerCommand('view', cmdView());
  TerminalObj.registerCommand('settings', cmdSettings());
  TerminalObj.registerCommand('lang', cmdLang());
  TerminalObj.registerCommand('action', cmdAction());
  TerminalObj.registerCommand('effect', cmdEffect());
}
