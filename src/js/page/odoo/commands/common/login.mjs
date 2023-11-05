// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from '@odoo/utils/get_odoo_session';
import callService from '@odoo/osv/call_service';
import searchRead from '@odoo/orm/search_read';
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

const cache = {
  databases: [],
  users: [],
};
async function getOptions(arg_name, arg_info, arg_value) {
  if (arg_name === 'database') {
    if (!arg_value) {
      const records = await callService('db', 'list', {});
      cache.databases = records;
      return cache.databases;
    }
    return cache.databases.filter(item => item.startsWith(arg_value));
  } else if (arg_name === 'user') {
    if (!arg_value) {
      const records = await searchRead(
        'res.users',
        [['active', '=', true]],
        ['login'],
        this.getContext(),
      );
      cache.users = records.map(item => item.login);
      return cache.users;
    }
    return cache.users.filter(item => item.startsWith(arg_value));
  }
  return [];
}

export default {
  definition: 'Login as...',
  callback: cmdLoginAs,
  options: getOptions,
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
