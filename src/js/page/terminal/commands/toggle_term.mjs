// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdToggleTerm(this: Terminal, kwargs: CMDCallbackArgs): Promise<> {
  let force_show;
  if (typeof kwargs.force !== 'undefined') {
    force_show = kwargs.force === 'show';
  }
  return this.doToggle(force_show);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdToggleTerm.definition', 'Toggle terminal visibility'),
    callback: cmdToggleTerm,
    detail: i18n.t('cmdToggleTerm.detail', 'Toggle terminal visibility'),
    args: [
      [ARG.String, ['f', 'force'], false, i18n.t('cmdToggleTerm.args.force', 'Force show/hide'), undefined, ['show', 'hide']],
    ],
    example: "-s true",
  };
}
