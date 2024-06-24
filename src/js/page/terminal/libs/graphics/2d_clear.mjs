// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function func2DClear(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  const ctx = kwargs.canvas.getContext("2d");
  const w = (kwargs.width === -1) ? kwargs.canvas.width : kwargs.width;
  const h = (kwargs.width === -1) ? kwargs.canvas.height : kwargs.height;
  ctx.clearRect(kwargs.x, kwargs.y, w, h);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DClear.definition', 'Clear canvas'),
    callback_internal: func2DClear,
    is_function: true,
    detail: i18n.t('cmd2DClear.detail', 'Clear canvas'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DClear.args.canvas', 'The canvas')],
      [ARG.Number, ['x', 'x'], false, i18n.t('cmd2DClear.args.from-x', 'The rect X point'), 0],
      [ARG.Number, ['y', 'y'], false, i18n.t('cmd2DClear.args.from-y', 'The rect Y point'), 0],
      [ARG.Number, ['w', 'width'], false, i18n.t('cmd2DClear.args.width', 'The rect width'), -1],
      [ARG.Number, ['h', 'height'], false, i18n.t('cmd2DClear.args.width', 'The rect height'), -1],
    ],
    example: "-c $myWindow",
  };
}
