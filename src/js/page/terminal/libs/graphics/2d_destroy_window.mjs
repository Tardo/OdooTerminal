// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmd2DDestroyWindow(this: Terminal, kwargs: CMDCallbackArgs): Promise<> {
  kwargs.canvas.remove();
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DDestroyWindow.definition', 'Destroy 2D Window'),
    callback: cmd2DDestroyWindow,
    is_hidden: true,
    detail: i18n.t('cmd2DCreateWindow.detail', 'Destroy 2D Window'),
    args: [
      [ARG.Any, ['c', 'canvas'], true, i18n.t('cmd2DDestroyWindow.args.canvas', 'The canvas')],
    ],
    example: "-c $myWindow",
  };
}
