// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import { LP_SUBSCRIPTIONS } from './constants';
import {getStorageItem, removeStorageItem, setStorageItem} from '@terminal/core/storage/local';
import doCall from './base/do_call';
import getOdooEnv from './utils/get_odoo_env';
import getOdooService from './utils/get_odoo_service';
import getOdooVersion from './utils/get_odoo_version';
import type OdooTerminal from '@odoo/terminal';

export default class Longpolling {
  #terminal: OdooTerminal;

  constructor(terminal: OdooTerminal) {
    this.#terminal = terminal;
    const OdooVerMajor = getOdooVersion('major');
    let has_listener = false;
    if (typeof OdooVerMajor === 'number') {
      if (OdooVerMajor <= 11) {
        // $FlowFixMe
        this.#getBusService().on('notification', this, this.#onBusNotification.bind(this, undefined));
        has_listener = true;
      } else if (OdooVerMajor >= 18) {
        const bus_serv = this.#getBusService();
        for (const subscription of LP_SUBSCRIPTIONS) {
          // $FlowFixMe
          bus_serv.subscribe(subscription, this.#onBusNotification.bind(this, subscription));
        }
        has_listener = true;
      } else if (OdooVerMajor >= 16) {
        // $FlowFixMe
        this.#busServ('addEventListener', 'notification', this.#onBusNotification.bind(this, undefined));
        has_listener = true;
      }
    }
    if (!has_listener) {
      this.#busServ('onNotification', this, (data: $ReadOnlyArray<OdooLongpollingItem>) =>
        this.#onBusNotification(undefined, data),
      );
    }
  }

  #getBusService(): BusService {
    return getOdooService('bus.bus')?.bus ?? getOdooEnv()?.services?.bus_service;
  }

  #busServ(method: string, ...params: $ReadOnlyArray<mixed>): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 14) {
      const bus_serv = this.#getBusService();
      if (!bus_serv) {
        throw new Error(i18n.t('longpolling.error.notAvailable', 'bus service not available'));
      }
      return bus_serv[method](...params);
    }
    return doCall('bus_service', method, ...params);
  }

  subscribe(name: string): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 18) {
      return this.#getBusService().subscribe(name);
    }
    throw new Error(i18n.t('longpolling.error.invalidVersion', 'This operation is not valid in the current Odoo version'));
  }

  unsubscribe(name: string): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 18) {
      return this.#getBusService().unsubscribe(name);
    }
    throw new Error(i18n.t('longpolling.error.invalidVersion', 'This operation is not valid in the current Odoo version'));
  }

  addChannel(name: string): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number') {
      if (OdooVerMajor <= 11) {
        return this.#getBusService().add_channel(name);
      } else if (OdooVerMajor >= 18) {
        return this.#getBusService().addChannel(name);
      }
    }
    return this.#busServ('addChannel', name);
  }

  deleteChannel(name: string): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number') {
      if (OdooVerMajor <= 11) {
        return this.#getBusService().delete_channel(name);
      } else if (OdooVerMajor >= 18) {
        return this.#getBusService().deleteChannel(name);
      }
    }
    return this.#busServ('deleteChannel', name);
  }

  startPoll(): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number') {
      if (OdooVerMajor <= 11) {
        return this.#getBusService().start_polling();
      } else if (OdooVerMajor >= 18) {
        return this.#getBusService().start();
      } else if (OdooVerMajor >= 16) {
        return this.#busServ('forceUpdateChannels');
      }
    }
    return this.#busServ('startPolling');
  }

  stopPoll(): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number') {
      if (OdooVerMajor <= 11) {
        return this.#getBusService().stop_polling();
      } else if (OdooVerMajor >= 18) {
        return this.#getBusService().stop();
      } else if (OdooVerMajor >= 16) {
        return this.#busServ('stop');
      }
    }
    return this.#busServ('stopPolling');
  }

  setVerbose(status: boolean) {
    if (status) {
      setStorageItem('terminal_longpolling_mode', 'verbose', err => this.#terminal.screen.print(err));
    } else {
      removeStorageItem('terminal_longpolling_mode');
    }
  }

  isVerbose(): boolean {
    return getStorageItem('terminal_longpolling_mode') === 'verbose';
  }

  #getNotificationsData(data: OdooLongpollingData): $ReadOnlyArray<OdooLongpollingItem> {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 16 && OdooVerMajor <= 17) {
      return data.detail;
    }
    return data;
  }
  #onBusNotification(subscription: string | void, data: $ReadOnlyArray<OdooLongpollingItem>) {
    // Fixme: Strange bug on first loads. It seems to not set the context correctly.
    if ('isVerbose' in this && this.isVerbose()) {
      this.#terminal.onBusNotification(subscription, this.#getNotificationsData(data));
    }
  }
}
