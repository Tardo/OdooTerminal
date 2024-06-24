// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import uniqueId from '@trash/utils/unique_id';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function func2DCreateWindow(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.id = uniqueId("TerminalGraphics");
  canvas.width = kwargs.width;
  canvas.height = kwargs.height;
  canvas.classList.add('terminal-graphics-window');
  if (typeof kwargs.x === 'undefined' && typeof kwargs.y === 'undefined') {
    canvas.style.marginLeft = 'auto';
    canvas.style.marginRight = 'auto';
    canvas.style.left = '0';
    canvas.style.top = '0';
  } else {
    canvas.style.left = `${kwargs.x}px`;
    canvas.style.top = `${kwargs.y}px`;
  }
  document.getElementsByTagName("body")[0].appendChild(canvas);
  return canvas;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DCreateWindow.definition', 'Create 2D Window'),
    callback_internal: func2DCreateWindow,
    is_function: true,
    detail: i18n.t('cmd2DCreateWindow.detail', 'Create 2D Window'),
    args: [
      [ARG.Number, ['w', 'width'], true, i18n.t('cmd2DCreateWindow.args.width', 'The canvas width')],
      [ARG.Number, ['h', 'height'], true, i18n.t('cmd2DCreateWindow.args.height', 'The canvas height')],
      [ARG.Number, ['x', 'x'], false, i18n.t('cmd2DCreateWindow.args.posx', 'The canvas position X')],
      [ARG.Number, ['y', 'y'], false, i18n.t('cmd2DCreateWindow.args.posy', 'The canvas position Y')],
    ],
    example: "-w 800 -h 600",
  };
}
