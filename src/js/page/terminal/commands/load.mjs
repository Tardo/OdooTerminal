// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import injectResource from '@terminal/utils/inject_resource';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdLoadResource(this: Terminal, kwargs: CMDCallbackArgs): Promise<> {
  return injectResource(new URL(kwargs.url), kwargs.type);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdLoad.definition', 'Load external resource'),
    callback: cmdLoadResource,
    detail: i18n.t('cmdLoad.detail', 'Load external source (javascript & css)'),
    args: [
      [ARG.String, ['u', 'url'], true, i18n.t('cmdLoad.args.url', 'The URL of the asset')],
      [ARG.String, ['t', 'type'], false, i18n.t('cmdLoad.args.type', 'The type of the asset'), undefined, ['js', 'mjs', 'css']],
    ],
    example: "-u 'https://example.com/core/term_extra.js'",
  };
}
