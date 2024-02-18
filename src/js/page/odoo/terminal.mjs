// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import logger from '@common/logger';
import Terminal from '@terminal/terminal';
import Longpolling from './longpolling';
import searchRead from './orm/search_read';
import ParameterGenerator from './parameter_generator';
import renderWelcome from './templates/welcome';
import getOdooSession from './utils/get_odoo_session';

export default class OdooTerminal extends Terminal {
  onBusNotification(notifications) {
    const l = notifications.length;
    for (let x = 0; x < l; ++x) {
      const notif = notifications[x];
      this.screen.print(
        `<strong>[<i class='fa fa-envelope-o'></i>][${moment().format()}] ${i18n.t('odoo.longpolling.new', 'New Longpolling Notification:')}</strong>`,
      );
      if (notif.constructor === Object) {
        this.screen.print(notif, false);
      } else {
        this.screen.print([`Channel ID: ${JSON.stringify(notif[0])}`]);
        this.screen.print(notif[1], false);
      }
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
  printWelcomeMessage() {
    this.screen.print(renderWelcome({ver: this.VERSION}));
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
      logger.warn(
        'odoo',
        i18n.t('odoo.longpolling.error.init', "Can't initilize longpolling: "),
        err,
      );
      this.longpolling = false;
    }
  }

  /**
   * @override
   */
  onCoreClick(ev) {
    super.onCoreClick(ev);
    if (ev.target.classList.contains('o_terminal_read_bin_field')) {
      this.#onTryReadBinaryField(ev.target);
    }
  }

  #onTryReadBinaryField(target) {
    const {model} = target.dataset;
    const {field} = target.dataset;
    const {id} = target.dataset;

    searchRead(model, [['id', '=', id]], [field], this.getContext())
      .then(result => {
        target.parentNode.textContent = JSON.stringify(result[0][field]);
      })
      .catch(
        () =>
          (target.parentNode.textContent = i18n.t(
            'odoo.longpolling.error.read',
            '** Reading Error! **',
          )),
      );
  }
}
