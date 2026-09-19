// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {ARG} from '@tardo/trash/constants';
import {FUNCTION_TYPE} from '@tardo/trash/function';
import scheduleDraw from './render_queue';
import {resolveWindow} from './windows';
import type {CMDCallbackArgs, CMDDef} from '@tardo/trash/interpreter';
import type VMachine from '@tardo/trash/vmachine';

async function func2DClear(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  const canvas = resolveWindow(kwargs.canvas);
  scheduleDraw(canvas, ctx => {
    const w = (kwargs.width === -1) ? canvas.width : kwargs.width;
    const h = (kwargs.height === -1) ? canvas.height : kwargs.height;
    ctx.clearRect(kwargs.x, kwargs.y, w, h);
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DClear.definition', 'Clear canvas'),
    callback: func2DClear,
    type: FUNCTION_TYPE.Internal,
    category: 'graphics',
    detail: i18n.t('cmd2DClear.detail', 'Clear canvas'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DClear.args.canvas', 'The canvas or its window id')],
      [ARG.Number, ['x', 'x'], false, i18n.t('cmd2DClear.args.from-x', 'The rect X point'), 0],
      [ARG.Number, ['y', 'y'], false, i18n.t('cmd2DClear.args.from-y', 'The rect Y point'), 0],
      [ARG.Number, ['w', 'width'], false, i18n.t('cmd2DClear.args.width', 'The rect width'), -1],
      [ARG.Number, ['h', 'height'], false, i18n.t('cmd2DClear.args.height', 'The rect height'), -1],
    ],
    example: "-c $myWindow",
  };
}
