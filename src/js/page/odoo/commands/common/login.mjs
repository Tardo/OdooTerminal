// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooSession from '@odoo/utils/get_odoo_session';
import cachedCallService from '@odoo/utils/cached_call_service';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdLoginAs(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const session = getOdooSession();
  let db = kwargs.database;
  let login = kwargs.user;
  let passwd = kwargs.password || false;
  if (login[0] === '#' && !passwd) {
    login = login.substr(1);
    passwd = login;
  }
  if (db === '*') {
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

function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'database') {
    return cachedCallService('options_db_list', 'db', 'list', []);
  } else if (arg_name === 'user') {
    return cachedSearchRead(
      'options_res.users_active',
      'res.users',
      [],
      ['login'],
      this.getContext({active_test: true}),
      item => item.name,
    );
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdLogin.definition', 'Login as...'),
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
