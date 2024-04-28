// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import type {CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdQuit(this: Terminal): Promise<mixed> {
  this.doHide();
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdPrint.definition', 'Close terminal'),
    callback: cmdQuit,
    detail: i18n.t('cmdPrint.detail', 'Close the terminal.'),
  };
}
