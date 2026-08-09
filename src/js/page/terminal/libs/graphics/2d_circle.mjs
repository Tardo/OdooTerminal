// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import scheduleDraw from './render_queue';
import {resolveWindow} from './windows';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function func2DCircle(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  scheduleDraw(resolveWindow(kwargs.canvas), ctx => {
    const start = (kwargs.start_angle * Math.PI) / 180;
    const end = (kwargs.end_angle * Math.PI) / 180;
    const partial = kwargs.end_angle - kwargs.start_angle < 360;
    ctx.beginPath();
    if (partial && !kwargs.stroke) {
      // Pie slice: connect the arc to the center
      ctx.moveTo(kwargs.x, kwargs.y);
    }
    ctx.arc(kwargs.x, kwargs.y, kwargs.radius, start, end);
    if (partial && !kwargs.stroke) {
      ctx.closePath();
    }
    if (kwargs.stroke) {
      ctx.lineWidth = kwargs.width;
      ctx.strokeStyle = kwargs.color;
      ctx.stroke();
    } else {
      ctx.fillStyle = kwargs.color;
      ctx.fill();
    }
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DCircle.definition', 'Draw a circle or arc'),
    callback: func2DCircle,
    type: FUNCTION_TYPE.Internal,
    category: 'graphics',
    detail: i18n.t('cmd2DCircle.detail', 'Draw a circle, arc or pie slice'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DCircle.args.canvas', 'The canvas or its window id')],
      [ARG.Number, ['x', 'x'], true, i18n.t('cmd2DCircle.args.x', 'The center X point')],
      [ARG.Number, ['y', 'y'], true, i18n.t('cmd2DCircle.args.y', 'The center Y point')],
      [ARG.Number, ['r', 'radius'], true, i18n.t('cmd2DCircle.args.radius', 'The radius')],
      [ARG.Number, ['sa', 'start-angle'], false, i18n.t('cmd2DCircle.args.start-angle', 'Start angle in degrees'), 0],
      [ARG.Number, ['ea', 'end-angle'], false, i18n.t('cmd2DCircle.args.end-angle', 'End angle in degrees'), 360],
      [ARG.String, ['cc', 'color'], false, i18n.t('cmd2DCircle.args.color', 'The color'), '#000'],
      [ARG.Flag, ['st', 'stroke'], false, i18n.t('cmd2DCircle.args.stroke', 'Draw the outline instead of filling')],
      [ARG.Number, ['w', 'width'], false, i18n.t('cmd2DCircle.args.width', 'The outline width'), 1],
    ],
    example: "-c $myWindow -x 100 -y 100 -r 50 -cc '#ff0000'",
  };
}
