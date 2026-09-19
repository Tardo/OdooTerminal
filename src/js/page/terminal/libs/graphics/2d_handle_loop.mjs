// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {ARG} from '@tardo/trash/constants';
import {FUNCTION_TYPE} from '@tardo/trash/function';
import {resolveWindow} from './windows';
import type {CMDCallbackArgs, CMDDef} from '@tardo/trash/interpreter';
import type {default as VMachine, EvalOptions} from '@tardo/trash/vmachine';
import type Frame from '@tardo/trash/frame';

async function func2DHandleLoop(
  vmachine: VMachine,
  kwargs: CMDCallbackArgs,
  frame: Frame,
  opts: EvalOptions,
): Promise<number> {
  const canvas = resolveWindow(kwargs.canvas);
  let count = 0;
  let last_time = -1;
  while (kwargs.max_frames === -1 || count < kwargs.max_frames) {
    const time: number = await new Promise(resolve => window.requestAnimationFrame(resolve));
    if (!canvas.isConnected) {
      break;
    }
    const delta = last_time === -1 ? 0 : time - last_time;
    last_time = time;
    const res = await vmachine.callFunctionValue(kwargs.fun, [time, delta, count], frame, opts);
    ++count;
    if (res === false) {
      break;
    }
  }
  return count;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DHandleLoop.definition', 'Run a graphics loop'),
    callback: func2DHandleLoop,
    type: FUNCTION_TYPE.Internal,
    category: 'graphics',
    detail: i18n.t(
      'cmd2DHandleLoop.detail',
      'Call the given function once per browser frame with (time, delta, count). Stops when the window is destroyed, after --max-frames, or when the function returns false. Returns the number of frames run',
    ),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DHandleLoop.args.canvas', 'The canvas or its window id')],
      [ARG.Any, ['f', 'fun'], true, i18n.t('cmd2DHandleLoop.args.fun', 'The draw function')],
      [
        ARG.Number,
        ['mf', 'max-frames'],
        false,
        i18n.t('cmd2DHandleLoop.args.max-frames', 'Stop after this many frames (-1 = unlimited)'),
        -1,
      ],
    ],
    example: '-c $myWindow -f $$draw -mf 300',
  };
}
