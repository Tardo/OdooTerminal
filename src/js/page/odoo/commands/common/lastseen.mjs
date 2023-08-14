// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from "@odoo/rpc";

async function cmdLastSeen() {
  if (!this.longpolling) {
    throw new Error("Can't use lastseen, 'bus' module is not installed");
  }
  return rpc
    .query({
      method: "search_read",
      fields: ["user_id", "last_presence"],
      model: "bus.presence",
      orderBy: "last_presence DESC",
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      let body = "";
      const len = result.length;
      for (let x = 0; x < len; ++x) {
        const record = result[x];
        body +=
          `<tr><td>${record.user_id[1]}</td>` +
          `<td>${record.user_id[0]}</td>` +
          `<td>${record.last_presence}</td></tr>`;
      }
      this.screen.printTable(["User Name", "User ID", "Last Seen"], body);
      return result;
    });
}

export default {
  definition: "Know user presence",
  callback: cmdLastSeen,
  detail: "Show users last seen",
};
