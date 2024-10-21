// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
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
        this.#getBusService().on('notification', this, this.#onBusNotification.bind(this));
        has_listener = true;
      } else if (OdooVerMajor >= 16) {
        // $FlowFixMe
        this.#busServ('addEventListener', 'notification', this.#onBusNotification.bind(this));
        has_listener = true;
      }
    }
    if (!has_listener) {
      this.#busServ('onNotification', this, (data: $ReadOnlyArray<OdooLongpollingItem>) =>
        this.#onBusNotification(data),
      );
    }
  }

  #getBusService(): BusService {
    return getOdooService('bus.bus')?.bus;
  }

  #busServ(method: string, ...params: $ReadOnlyArray<mixed>): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 14) {
      const bus_serv = getOdooEnv()?.services?.bus_service;
      if (!bus_serv) {
        throw new Error(i18n.t('longpolling.error.notAvailable', 'bus service not available'));
      }
      return bus_serv[method](...params);
    }
    return doCall('bus_service', method, ...params);
  }

  addChannel(name: string): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor <= 11) {
      return this.#getBusService().add_channel(name);
    }
    return this.#busServ('addChannel', name);
  }

  deleteChannel(name: string): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor <= 11) {
      return this.#getBusService().delete_channel(name);
    }
    return this.#busServ('deleteChannel', name);
  }

  startPoll(): mixed {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number') {
      if (OdooVerMajor <= 11) {
        return this.#getBusService().start_polling();
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

  // $FlowFixMe
  #getNotificationsData(data: Object): $ReadOnlyArray<OdooLongpollingItem> {
    const OdooVerMajor = getOdooVersion('major');
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 16) {
      return data.detail;
    }
    return data;
  }
  #onBusNotification(data: $ReadOnlyArray<OdooLongpollingItem>) {
    if (this.isVerbose()) {
      this.#terminal.onBusNotification(this.#getNotificationsData(data));
    }
  }
}
