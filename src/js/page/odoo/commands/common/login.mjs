// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from '@odoo/utils/get_odoo_session';
import {ARG} from '@trash/constants';

async function cmdLoginAs(kwargs, screen) {
  const session = getOdooSession();
  let db = kwargs.database;
  let login = kwargs.user;
  let passwd = kwargs.password || false;
  if (login[0] === '#' && !passwd) {
    login = login.substr(1);
    passwd = login;
  }
  if (db === '*') {
    if (!session.db) {
      throw new Error(
        'Unknown active database. Try using ' +
          "'<span class='o_terminal_click o_terminal_cmd' " +
          "data-cmd='dblist'>dblist</span>' command.",
      );
    }
    db = session.db;
  }

  const res = await session._session_authenticate(db, login, passwd);
  screen.updateInputInfo({username: login});
  screen.print(`Successfully logged as '${login}'`);
  if (!kwargs.no_reload) {
    await this.execute('reload', false, true);
  }
  return res;
}

export default {
  definition: 'Login as...',
  callback: cmdLoginAs,
  detail: 'Login as selected user.',
  args: [
    [
      ARG.String,
      ['d', 'database'],
      true,
      "The database<br/>Can be '*' to use current database",
    ],
    [
      ARG.String,
      ['u', 'user'],
      true,
      "The login<br/>Can be optionally preceded by the '#' character and it will be used for password too",
    ],
    [ARG.String, ['p', 'password'], false, 'The password'],
    [ARG.Flag, ['nr', 'no-reload'], false, 'No reload'],
  ],
  secured: true,
  example: '-d devel -u #admin',
};
