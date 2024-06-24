// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmd2DRect(this: Terminal, kwargs: CMDCallbackArgs): Promise<> {
  const ctx = kwargs.canvas.getContext("2d");
  ctx.fillStyle = kwargs.color;
  ctx.fillRect(kwargs.x, kwargs.y, kwargs.width, kwargs.height);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DRect.definition', 'Draw a rect'),
    callback: cmd2DRect,
    is_hidden: true,
    detail: i18n.t('cmd2DRect.detail', 'Draw a rect'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DRect.args.canvas', 'The canvas')],
      [ARG.Number, ['x', 'x'], true, i18n.t('cmd2DRect.args.from-x', 'The rect X point')],
      [ARG.Number, ['y', 'y'], true, i18n.t('cmd2DRect.args.from-y', 'The rect Y point')],
      [ARG.Number, ['w', 'width'], true, i18n.t('cmd2DRect.args.width', 'The rect width'), 1],
      [ARG.Number, ['h', 'height'], true, i18n.t('cmd2DRect.args.width', 'The rect height'), 1],
      [ARG.String, ['rc', 'color'], false, i18n.t('cmd2DRect.args.width', 'The rect color'), "#000"],
    ],
    example: "-c $myWindow -fx 20 -fy 20 -w 120 -h 120 -rc '#ff0000'",
  };
}
