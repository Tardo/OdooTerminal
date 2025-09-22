// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function func2DDestroyWindow(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  kwargs.canvas.remove();
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DDestroyWindow.definition', 'Destroy 2D Window'),
    callback: func2DDestroyWindow,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('cmd2DDestroyWindow.detail', 'Destroy 2D Window'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DDestroyWindow.args.canvas', 'The canvas')],
    ],
    example: "-c $myWindow",
  };
}
