// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpcQuery from '@odoo/rpc';
import callService from '@odoo/osv/call_service';
import getOdooSession from '@odoo/utils/get_odoo_session';
import {ARG} from '@trash/constants';

async function cmdShowDBList(kwargs, screen) {
  const session = getOdooSession();
  const _onSuccess = databases => {
    const databases_len = databases.length;
    if (!databases_len) {
      // Soft-Error
      screen.printError("Can't get database names");
      return;
    }
    // Search active database
    let index = 0;
    const s_databases = [];
    while (index < databases_len) {
      const database = databases[index];
      if (kwargs.only_active) {
        if (database === session.db) {
          screen.eprint(database);
          return database;
        }
      } else if (database === session.db) {
        s_databases.push(`<strong>${database}</strong> (Active Database)`);
      } else {
        s_databases.push(database);
      }
      ++index;
    }

    if (kwargs.only_active) {
      return false;
    }
    screen.print(s_databases);
    return databases;
  };
  const _onError = err => {
    if (!kwargs.only_active) {
      throw err;
    }
    // Heuristic way to determine the database name
    return rpcQuery({
      route: '/websocket/peek_notifications',
      params: [
        ['channels', []],
        ['last', 9999999],
        ['is_first_poll', true],
      ],
    }).then(result => {
      if (result.channels[0]) {
        const dbname = result.channels[0][0];
        screen.eprint(dbname);
        return dbname;
      }
      return false;
    });
  };

  // Check if using deferred jquery or native promises
  const prom = callService('db', 'list', {});
  if ('catch' in prom) {
    return prom.then(_onSuccess).catch(_onError);
  }
  return prom.then(_onSuccess).fail(_onError);
}

export default {
  definition: 'Show database names',
  callback: cmdShowDBList,
  detail: 'Show database names',
  args: [
    [
      ARG.Flag,
      ['oa', 'only-active'],
      false,
      'Indicates that only print the active database name',
    ],
  ],
};
