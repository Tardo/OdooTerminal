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

async function func2DLine(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  scheduleDraw(resolveWindow(kwargs.canvas), ctx => {
    ctx.beginPath();
    ctx.moveTo(kwargs.from_x, kwargs.from_y);
    ctx.lineTo(kwargs.to_x, kwargs.to_y);
    ctx.lineWidth = kwargs.width;
    ctx.strokeStyle = kwargs.color;
    ctx.stroke();
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DLine.definition', 'Draw a line'),
    callback: func2DLine,
    type: FUNCTION_TYPE.Internal,
    category: 'graphics',
    detail: i18n.t('cmd2DLine.detail', 'Draw a line'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DLine.args.canvas', 'The canvas or its window id')],
      [ARG.Number, ['fx', 'from-x'], true, i18n.t('cmd2DLine.args.from-x', 'The line from X point')],
      [ARG.Number, ['fy', 'from-y'], true, i18n.t('cmd2DLine.args.from-y', 'The line from Y point')],
      [ARG.Number, ['tx', 'to-x'], true, i18n.t('cmd2DLine.args.to-x', 'The line to X point')],
      [ARG.Number, ['ty', 'to-y'], true, i18n.t('cmd2DLine.args.to-y', 'The line to Y point')],
      [ARG.Number, ['w', 'width'], false, i18n.t('cmd2DLine.args.width', 'The line width'), 1],
      [ARG.String, ['lc', 'color'], false, i18n.t('cmd2DLine.args.color', 'The line color'), "#000"],
    ],
    example: "-c $myWindow -fx 20 -fy 20 -tx 40 -ty 40 -w 2 -lc '#ff0000'",
  };
}
