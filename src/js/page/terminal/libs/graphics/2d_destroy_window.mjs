// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {ARG} from '@tardo/trash/constants';
import {FUNCTION_TYPE} from '@tardo/trash/function';
import {resolveWindow, unregisterWindow} from './windows';
import type {CMDCallbackArgs, CMDDef} from '@tardo/trash/interpreter';
import type VMachine from '@tardo/trash/vmachine';

async function func2DDestroyWindow(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  const canvas = resolveWindow(kwargs.canvas);
  unregisterWindow(canvas);
  canvas.remove();
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DDestroyWindow.definition', 'Destroy 2D Window'),
    callback: func2DDestroyWindow,
    type: FUNCTION_TYPE.Internal,
    category: 'graphics',
    detail: i18n.t('cmd2DDestroyWindow.detail', 'Destroy 2D Window'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DDestroyWindow.args.canvas', 'The canvas or its window id')],
    ],
    example: "-c $myWindow",
  };
}
