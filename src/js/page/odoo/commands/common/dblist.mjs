// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import rpcQuery from '@odoo/rpc';
import callService from '@odoo/osv/call_service';
import getOdooSession from '@odoo/utils/get_odoo_session';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdShowDBList(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const session = getOdooSession();
  if (typeof session === 'undefined') {
    throw new Error(
      i18n.t('cmdDBList.error.notSession', 'Cannot find session information')
    );
  }

  const _onSuccess = (databases: $ReadOnlyArray<string>) => {
    const databases_len = databases.length;
    if (!databases_len) {
      // Soft-Error
      ctx.screen.printError(i18n.t('cmdDBList.error.noDBNames', "Can't get database names"));
      return;
    }
    // Search active database
    let index = 0;
    const s_databases = [];
    while (index < databases_len) {
      const database = databases[index];
      if (kwargs.only_active) {
        if (database === session.db) {
          ctx.screen.eprint(database);
          return database;
        }
      } else if (database === session.db) {
        s_databases.push(
          i18n.t('cmdDBList.result.activeDatabase', '<strong>{{database}}</strong> (Active Database)', {database}),
        );
      } else {
        s_databases.push(database);
      }
      ++index;
    }

    if (kwargs.only_active) {
      return false;
    }
    ctx.screen.print(s_databases);
    return databases;
  };
  const _onError = (err: Error) => {
    if (!kwargs.only_active) {
      throw err;
    }
    // Heuristic way to determine the database name
    return rpcQuery<{[string]: mixed}>({
      route: '/websocket/peek_notifications',
      params: [
        ['channels', []],
        ['last', 9999999],
        ['is_first_poll', true],
      ],
    }).then(result => {
      if (result.channels instanceof Array && result.channels[0]) {
        const dbname = result.channels[0][0];
        ctx.screen.eprint(dbname);
        return dbname;
      }
      return false;
    });
  };

  // Check if using deferred jquery or native promises
  // $FlowFixMe
  const prom = callService('db', 'list', {});
  if ('catch' in prom) {
    return prom.then(_onSuccess).catch(_onError);
  }
  // $FlowIgnore
  return prom.then(_onSuccess).fail(_onError);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdDBList.definition', 'Show database names'),
    callback: cmdShowDBList,
    detail: i18n.t('cmdDBList.detail', 'Show database names'),
    args: [
      [
        ARG.Flag,
        ['oa', 'only-active'],
        false,
        i18n.t('cmdDBList.args.onlyActive', 'Indicates that only print the active database name'),
      ],
    ],
  };
}
