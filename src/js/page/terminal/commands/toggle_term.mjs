// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import type {CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdToggleTerm(this: Terminal): Promise<mixed> {
  return this.doToggle();
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdToggleTerm.definition', 'Toggle terminal visibility'),
    callback: cmdToggleTerm,
    detail: i18n.t('cmdToggleTerm.detail', 'Toggle terminal visibility'),
  };
}
