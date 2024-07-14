// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdInput(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<string> {
  return await ctx.screen
    .showQuestion(
      kwargs.question,
      kwargs.choices,
      kwargs.default,
    );
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdInput.definition', 'Requests user input'),
    callback: cmdInput,
    detail: i18n.t('cmdInput.detail', 'Returns the data entered by the user.'),
    args: [
      [ARG.String, ['q', 'question'], true, i18n.t('cmdInput.args.question', 'The question')],
      [ARG.List | ARG.Any, ['c', 'choices'], false, i18n.t('cmdInput.args.choices', 'The choices')],
      [ARG.Any, ['d', 'default'], false, i18n.t('cmdInput.args.default', 'The default choice')],
    ],
    example: "-m 'Age?'",
  };
}
