// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';

async function cmdPrint(kwargs, screen) {
  screen.print(kwargs.msg);
  return kwargs.msg;
}

export default {
  definition: i18n.t('cmdPrint.definition', 'Print a message'),
  callback: cmdPrint,
  detail: i18n.t('cmdPrint.detail', 'Eval parameters and print the result.'),
  args: [
    [
      ARG.Any,
      ['m', 'msg'],
      true,
      i18n.t('cmdPrint.args.msg', 'The message to print'),
    ],
  ],
  aliases: ['echo'],
  example: "-m 'This is a example'",
};
