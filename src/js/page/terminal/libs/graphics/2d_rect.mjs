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

async function func2DRect(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  scheduleDraw(resolveWindow(kwargs.canvas), ctx => {
    ctx.fillStyle = kwargs.color;
    ctx.fillRect(kwargs.x, kwargs.y, kwargs.width, kwargs.height);
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DRect.definition', 'Draw a rect'),
    callback: func2DRect,
    type: FUNCTION_TYPE.Internal,
    category: 'graphics',
    detail: i18n.t('cmd2DRect.detail', 'Draw a rect'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DRect.args.canvas', 'The canvas or its window id')],
      [ARG.Number, ['x', 'x'], true, i18n.t('cmd2DRect.args.x', 'The rect X point')],
      [ARG.Number, ['y', 'y'], true, i18n.t('cmd2DRect.args.y', 'The rect Y point')],
      [ARG.Number, ['w', 'width'], true, i18n.t('cmd2DRect.args.width', 'The rect width'), 1],
      [ARG.Number, ['h', 'height'], true, i18n.t('cmd2DRect.args.height', 'The rect height'), 1],
      [ARG.String, ['rc', 'color'], false, i18n.t('cmd2DRect.args.color', 'The rect color'), "#000"],
    ],
    example: "-c $myWindow -x 20 -y 20 -w 120 -h 120 -rc '#ff0000'",
  };
}
