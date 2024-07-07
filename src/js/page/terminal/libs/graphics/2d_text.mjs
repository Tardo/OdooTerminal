// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function func2DText(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  const ctx = kwargs.canvas.getContext("2d");
  ctx.fillStyle = kwargs.color;
  ctx.font = kwargs.font;
  ctx.fillText(kwargs.text, kwargs.x, kwargs.y);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('func2DText.definition', 'Draw a text'),
    callback_internal: func2DText,
    is_function: true,
    detail: i18n.t('func2DText.detail', 'Draw a text'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('func2DText.args.canvas', 'The canvas')],
      [ARG.String, ['t', 'text'], true, i18n.t('func2DText.args.text', 'The text')],
      [ARG.Number, ['x', 'x'], true, i18n.t('func2DText.args.x', 'The text X point')],
      [ARG.Number, ['y', 'y'], true, i18n.t('func2DText.args.y', 'The text Y point')],
      [ARG.String, ['f', 'font'], true, i18n.t('func2DText.args.font', 'The text font'), 1],
      [ARG.String, ['tc', 'color'], false, i18n.t('func2DText.args.width', 'The text color'), "#000"],
    ],
    example: "-c $myWindow 'Hello World!' -x 20 -y 20 -tc '#ff0000'",
  };
}
