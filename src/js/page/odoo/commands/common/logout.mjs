// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {getOdooSession} from "@odoo/utils";

const session = getOdooSession();

function cmdLogOut() {
  return new Promise(async (resolve, reject) => {
    const res = await session.session_logout();
    this.screen.updateInputInfo({username: "Public User"});
    this.screen.print("Logged out");
    try {
      this.execute("reload", false, true);
    } catch (err) {
      return reject(err);
    }
    return resolve(res);
  });
}

export default {
  definition: "Log out",
  callback: cmdLogOut,
  detail: "Session log out",
};
