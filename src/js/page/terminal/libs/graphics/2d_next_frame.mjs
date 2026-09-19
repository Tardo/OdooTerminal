// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {FUNCTION_TYPE} from '@tardo/trash/function';
import type {CMDDef} from '@tardo/trash/interpreter';

async function func2DNextFrame(): Promise<number> {
  return new Promise(resolve => window.requestAnimationFrame(resolve));
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('func2DNextFrame.definition', 'Wait for the next animation frame'),
    callback: func2DNextFrame,
    type: FUNCTION_TYPE.Internal,
    category: 'graphics',
    detail: i18n.t(
      'func2DNextFrame.detail',
      'Waits until the browser is ready to paint the next frame and returns its timestamp. Use it to pace animation loops instead of sleep.',
    ),
  };
}
