// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import logger from '@common/logger';
import Terminal from '@terminal/terminal';
import Longpolling from './longpolling';
import searchRead from './orm/search_read';
import ParameterGenerator from './parameter_generator';
import renderWelcome from './templates/welcome';
import getOdooSession from './utils/get_odoo_session';

export default class OdooTerminal extends Terminal {
  parameterGenerator: ParameterGenerator;
  longpolling: ?Longpolling;

  // $FlowFixMe
  onBusNotification(notifications: $ReadOnlyArray<[string, string] | {...}>) {
    const l = notifications.length;
    for (let x = 0; x < l; ++x) {
      const notif = notifications[x];
      this.screen.print(
        // $FlowIgnore
        `<strong>[<i class='fa fa-envelope-o'></i>][${moment().format()}] ${i18n.t('odoo.longpolling.new', 'New Longpolling Notification:')}</strong>`,
      );
      if (notif.constructor === Object) {
        this.screen.print(notif, false);
      } else if (notif instanceof Array) {
        this.screen.print([`Channel ID: ${JSON.stringify(notif[0])}`]);
        this.screen.print(notif[1], false);
      }
    }
  }

  /**
   * @override
   */
  // eslint-disable-next-line no-unused-vars
  getContext(extra_context: ?{[string]: mixed}): {[string]: mixed} {
    const context = super.getContext(arguments);
    let sess_user_ctx = getOdooSession()?.user_context;
    if (sess_user_ctx === null || typeof sess_user_ctx === 'undefined') {
      sess_user_ctx = {};
    }
    return Object.assign({}, sess_user_ctx, context);
  }

  /**
   * @override
   */
  printWelcomeMessage() {
    this.screen.print(renderWelcome(this.VERSION));
  }

  /**
   * @override
   */
  async start(): Promise<> {
    await super.start();
    // Helpers
    const helpers = `
      $RMOD=function(){return (url -s hash -k model)}
      $RID=function(){return (url -s hash -k id)}
    `;
    await this.execute(helpers, false, true);
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
      logger.warn('odoo', i18n.t('odoo.longpolling.error.init', "Can't initilize longpolling: "), err);
      this.longpolling = undefined;
    }
  }

  /**
   * @override
   */
  onCoreClick(ev: MouseEvent) {
    super.onCoreClick(ev);
    if (ev.target instanceof HTMLElement && ev.target.classList.contains('o_terminal_read_bin_field')) {
      // $FlowFixMe
      this.#onTryReadBinaryField(ev.target);
    }
  }

  #onTryReadBinaryField(target: HTMLElement) {
    const {model} = target.dataset;
    const {field} = target.dataset;
    const {id} = target.dataset;

    searchRead(model, [['id', '=', id]], [field], this.getContext())
      .then(result => {
        if (target.parentNode) {
          target.parentNode.textContent = JSON.stringify(result[0][field]) || '';
        }
      })
      .catch(() => {
        if (target.parentNode) {
          target.parentNode.textContent = i18n.t('odoo.longpolling.error.read', '** Reading Error! **');
        }
      });
  }
}
