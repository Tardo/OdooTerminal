// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import file2file from '@terminal/utils/file2file';
import type {CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdRun(this: Terminal): Promise<> {
  const file_obj = await file2file();
  const file_content = await file_obj.text();
  return await this.execute(file_content, false, false, true);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdRun.definition', 'Run a TraSH script'),
    category: 'terminal',
    callback: cmdRun,
    detail: i18n.t('cmdRun.detail', 'Run a TraSH script'),
  };
}
