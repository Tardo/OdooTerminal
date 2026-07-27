// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import scheduleDraw from './render_queue';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function func2DPoly(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  if (kwargs.points.length < 2) {
    return;
  }
  scheduleDraw(kwargs.canvas, ctx => {
    ctx.beginPath();
    ctx.moveTo(kwargs.points[0][0], kwargs.points[0][1]);
    for (let index = 1; index < kwargs.points.length; ++index) {
      ctx.lineTo(kwargs.points[index][0], kwargs.points[index][1]);
    }
    if (kwargs.fill) {
      ctx.closePath();
      ctx.fillStyle = kwargs.color;
      ctx.fill();
    } else {
      ctx.lineWidth = kwargs.width;
      ctx.strokeStyle = kwargs.color;
      ctx.stroke();
    }
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DPoly.definition', 'Draw a polyline or polygon'),
    callback: func2DPoly,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t(
      'cmd2DPoly.detail',
      'Draw a polyline from a list of [x, y] points. With --fill the shape is closed and filled',
    ),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DPoly.args.canvas', 'The canvas')],
      [ARG.List | ARG.Any, ['p', 'points'], true, i18n.t('cmd2DPoly.args.points', 'The list of [x, y] points')],
      [ARG.String, ['pc', 'color'], false, i18n.t('cmd2DPoly.args.color', 'The color'), '#000'],
      [ARG.Flag, ['f', 'fill'], false, i18n.t('cmd2DPoly.args.fill', 'Close the shape and fill it')],
      [ARG.Number, ['w', 'width'], false, i18n.t('cmd2DPoly.args.width', 'The line width'), 1],
    ],
    example: "-c $myWindow -p [[10, 90], [50, 20], [90, 60]] -pc '#ff0000' -w 2",
  };
}
