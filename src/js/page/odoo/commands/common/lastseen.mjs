// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import searchRead from '@odoo/orm/search_read';

async function cmdLastSeen() {
  if (!this.longpolling) {
    throw new Error("Can't use lastseen, 'bus' module is not installed");
  }
  return searchRead(
    'bus.presence',
    [],
    ['user_id', 'last_presence'],
    this.getContext(),
    {
      orderBy: 'last_presence DESC',
    },
  ).then(result => {
    const rows = [];
    const len = result.length;
    for (let x = 0; x < len; ++x) {
      const row_index = rows.push([]) - 1;
      const record = result[x];
      rows[row_index].push(
        record.user_id[1],
        record.user_id[0],
        record.last_presence,
      );
    }
    this.screen.printTable(['User Name', 'User ID', 'Last Seen'], rows);
    return result;
  });
}

export default {
  definition: 'Know user presence',
  callback: cmdLastSeen,
  detail: 'Show users last seen',
};
