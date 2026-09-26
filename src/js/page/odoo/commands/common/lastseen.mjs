// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import searchRead from '@odoo/orm/search_read';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdLastSeen(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (!this.longpolling) {
    throw new Error(i18n.t('cmdLastSeen.error.notAvailable', "Can't use lastseen, 'bus' module is not installed"));
  }
  const version = getOdooVersion('major');
  const model = typeof version === 'number' && version >= 19 ? 'mail.presence' : 'bus.presence';
  return searchRead(model, [['user_id', '>', 0]], ['user_id', 'last_presence'], await this.getContext(), {
    orderBy: 'last_presence DESC',
  }).then(result => {
    const rows = [];
    const len = result.length;
    for (let x = 0; x < len; ++x) {
      const row_index = rows.push([]) - 1;
      const record = result[x];
      rows[row_index].push(record.user_id[1], record.user_id[0], record.last_presence);
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdLastSeen.table.userName', 'User Name'),
        i18n.t('cmdLastSeen.table.userID', 'User ID'),
        i18n.t('cmdLastSeen.table.lastSeen', 'Last Seen'),
      ],
      rows,
    );
    return result;
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdLastSeen.definition', 'Know user presence'),
    category: 'system',
    callback: cmdLastSeen,
    detail: i18n.t('cmdLastSeen.detail', 'Show users last seen'),
  };
}
