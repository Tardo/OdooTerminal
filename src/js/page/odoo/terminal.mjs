// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import ParameterGenerator from "@odoo/parameter_generator";
import Longpolling from "@odoo/longpolling";
import Terminal from "@terminal/terminal";
import {getOdooSession} from "@odoo/utils";

export default class OdooTerminal extends Terminal {
  onBusNotification(notifications) {
    const l = notifications.length;
    for (let x = 0; x < l; ++x) {
      const notif = notifications[x];
      this.screen.print(
        `<strong>[<i class='fa fa-envelope-o'></i>][${moment().format()}] New Longpolling Notification:</strong>`
      );
      this.screen.print([`Channel ID: ${JSON.stringify(notif[0])}`]);
      this.screen.print(notif[1], false);
    }
  }

  /**
   * @override
   */
  getContext() {
    const context = super.getContext(arguments);
    const odoo_context = getOdooSession()?.user_context || {};
    return Object.assign({}, odoo_context, context);
  }

  /**
   * @override
   */
  onStart() {
    super.onStart();
    this.parameterGenerator = new ParameterGenerator();
    try {
      this.longpolling = new Longpolling(this);
    } catch (err) {
      // This happens if 'bus' module is not installed
      console.warn("[OdooTerminal] Can't initilize longpolling: ", err);
      this.longpolling = false;
    }
  }
}
