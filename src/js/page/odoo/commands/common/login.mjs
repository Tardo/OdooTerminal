// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import getOdooSession from '@odoo/utils/get_odoo_session';
import callService from '@odoo/osv/call_service';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdLoginAs(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const session = getOdooSession();
  if (typeof session === 'undefined') {
    throw new Error(
      i18n.t('cmdLogin.error.notSession', 'Cannot find session information')
    );
  }

  let db = kwargs.database;
  let login = kwargs.user;
  let passwd = kwargs.password || false;
  if (login[0] === '#' && !passwd) {
    login = login.substr(1);
    passwd = login;
  }
  if (db === '*') {
    // $FlowFixMe[invalid-compare]
    if (session.db === null || typeof session.db === 'undefined' || !session.db) {
      throw new Error(
        i18n.t(
          'cmdLogin.error.unknownDB',
          'Unknown active database. Try using ' +
            "'<span class='o_terminal_click o_terminal_cmd' " +
            "data-cmd='dblist'>dblist</span>' command.",
        ),
      );
    }
    db = session.db;
  }

  const res = await session._session_authenticate(db, login, passwd);
  ctx.screen.updateInputInfo({username: login});
  ctx.screen.print(
    i18n.t('cmdLogin.result.success', "Successfully logged as '{{login}}'", {
      login,
    }),
  );
  if (!kwargs.no_reload) {
    await this.execute('reload', false, true);
  }
  return res;
}

let databases: Promise<Array<string>> | void;

async function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'database') {
    if (!databases) {
      databases = callService<Array<string>>('db', 'list', []).catch(() => {
        databases = undefined;
        return [];
      });
    }
    return databases;
  } else if (arg_name === 'user') {
    return cachedSearchRead(
      'options_res.users_active',
      'res.users',
      [],
      ['login'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'login ASC'},
      item => item.login,
    );
  }
  return [];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdLogin.definition', 'Login as...'),
    category: 'system',
    callback: cmdLoginAs,
    options: getOptions,
    detail: i18n.t('cmdLogin.detail', 'Login as selected user.'),
    args: [
      [
        ARG.String,
        ['d', 'database'],
        true,
        i18n.t('cmdLogin.args.database', "The database<br/>Can be '*' to use current database"),
      ],
      [
        ARG.String,
        ['u', 'user'],
        true,
        i18n.t(
          'cmdLogin.args.user',
          "The login<br/>Can be optionally preceded by the '#' character and it will be used for password too",
        ),
      ],
      [ARG.String, ['p', 'password'], false, i18n.t('cmdLogin.args.password', 'The password')],
      [ARG.Flag, ['nr', 'no-reload'], false, i18n.t('cmdLogin.args.noReload', 'No reload')],
    ],
    secured: true,
    example: '-d devel -u #admin',
  };
}
