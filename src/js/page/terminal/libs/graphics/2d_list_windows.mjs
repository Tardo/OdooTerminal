// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {FUNCTION_TYPE} from '@tardo/trash/function';
import {listWindows} from './windows';
import type {CMDDef} from '@tardo/trash/interpreter';

type WindowInfo = {id: string, width: number, height: number};

async function func2DListWindows(): Promise<$ReadOnlyArray<WindowInfo>> {
  return listWindows().map(canvas => ({id: canvas.id, width: canvas.width, height: canvas.height}));
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmd2DListWindows.definition', 'List 2D windows'),
    callback: func2DListWindows,
    type: FUNCTION_TYPE.Internal,
    category: 'graphics',
    detail: i18n.t(
      'cmd2DListWindows.detail',
      'List the currently open 2D windows with their unique id, width and height',
    ),
  };
}
