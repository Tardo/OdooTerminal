// @flow strict
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
import getSessionInfo from './net_utils/get_session_info';
import codeHelpers from './base/helpers';
import cmdAIAgent from '@ai/operations/agent';

export default class OdooTerminal extends Terminal {
  parameterGenerator: ParameterGenerator;
  longpolling: ?Longpolling;

  onBusNotification(subscription: string | void, notifications: $ReadOnlyArray<[string, string] | {...}>) {
    const local_now = (new Date()).toLocaleString();
    let section = i18n.t('odoo.longpolling.new', 'New Longpolling Notification:');
    if (typeof subscription !== 'undefined') {
      section = `${subscription}:`;
    }
    const head_msg = `<strong>[<i class='fa fa-envelope-o'></i>][${local_now}] ${section}</strong>`;
    if (notifications.constructor === Object) {
      this.screen.print(head_msg);
      this.screen.print(notifications, false);
    } else {
      const l = notifications.length;
      for (let x = 0; x < l; ++x) {
        const notif = notifications[x];
        this.screen.print(head_msg);
        if (notif.constructor === Object) {
          this.screen.print(notif, false);
        } else if (notif instanceof Array) {
          this.screen.print([`Channel ID: ${JSON.stringify(notif[0])}`]);
          this.screen.print(notif[1], false);
        }
      }
    }
  }

  /**
   * @override
   */
  // eslint-disable-next-line no-unused-vars
  async getContext(extra_context: ?{[string]: mixed}): Promise<OdooSessionInfoUserContext> {
    const context = await super.getContext(arguments);
    const sess_user_ctx = getOdooSession()?.user_context ?? (await getSessionInfo())?.user_context ?? {};
    return {
      ...sess_user_ctx,
      ...context,
    };
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
    await this.execute(codeHelpers, false, true);
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
    const target = ev.target;
    if (target instanceof HTMLElement && target.classList.contains('o_terminal_read_bin_field')) {
      this.#onTryReadBinaryField(target);
    }
  }

  /**
   * @override
   */
  async onAIModeInput(input: string): Promise<> {
    const convId = this.getActiveConvId();
    if (convId === null) {
      return;
    }

    const history: Array<AIMessage> = this.getConvMessages(convId);
    const isFirstMessage = history.length === 0;

    let updatedHistory: Array<AIMessage>;
    this._setAIWorking(true);
    try {
      // $FlowFixMe[class-object-subtyping]
      updatedHistory = await cmdAIAgent.call(
        this,
        {prompt: input, model: null, timeout: null, max_steps: null, max_verifications: null, initial_messages: history},
        {screen: this.screen},
      );
    } catch (err) {
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        const msg = err instanceof Error ? err.message : String(err);
        this.screen.printError(msg);
      }
      return;
    } finally {
      this._setAIWorking(false);
    }

    this.saveConvMessages(convId, updatedHistory);
    if (isFirstMessage) {
      this.updateConvName(convId, input.slice(0, 40) || i18n.t('terminal.ai.newConversation', 'New conversation'));
    }
  }

  async #onTryReadBinaryField(target: HTMLElement) {
    const {model} = target.dataset;
    const {field} = target.dataset;
    const {id} = target.dataset;

    searchRead(model, [['id', '=', id]], [field], await this.getContext())
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
