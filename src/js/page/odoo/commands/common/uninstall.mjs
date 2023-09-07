// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModelMulti from '@odoo/osv/call_model_multi';
import isEmpty from '@terminal/utils/is_empty';
import {ARG} from '@trash/constants';
import {searchModules} from './__utils__';

async function cmdUninstallModule(kwargs, screen) {
  const modue_infos = await searchModules.bind(this)(kwargs.module);
  if (!isEmpty(modue_infos)) {
    if (!kwargs.force) {
      let depends = await this.execute(
        `depends -m ${kwargs.module}`,
        false,
        true,
      );
      if (isEmpty(depends)) {
        return;
      }
      depends = depends.filter(item => item !== kwargs.module);
      if (!isEmpty(depends)) {
        screen.print('This operation will remove these modules too:');
        screen.print(depends);
        const res = await screen.showQuestion(
          'Do you want to continue?',
          ['y', 'n'],
          'n',
        );
        if (res?.toLowerCase() !== 'y') {
          screen.printError('Operation cancelled');
          return false;
        }
      }
    }

    await callModelMulti(
      'ir.module.module',
      modue_infos[0].id,
      'button_immediate_uninstall',
      null,
      null,
      this.getContext(),
    );

    screen.print(
      `'${kwargs.module}' (${modue_infos[0].display_name}) module successfully uninstalled`,
    );
    return modue_infos[0];
  }
  throw new Error(`'${kwargs.module}' module doesn't exists`);
}

export default {
  definition: 'Uninstall a module',
  callback: cmdUninstallModule,
  detail: 'Launch module deletion process.',
  args: [
    [ARG.String, ['m', 'module'], true, 'The module technical name'],
    [ARG.Flag, ['f', 'force'], false, 'Forced mode'],
  ],
  example: '-m contacts',
};
