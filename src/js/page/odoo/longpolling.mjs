// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '@terminal/core/storage/local';
import doCall from './base/do_call';
import getOdooEnv from './utils/get_odoo_env';
import getOdooService from './utils/get_odoo_service';
import getOdooVersionMajor from './utils/get_odoo_version_major';

export default class Longpolling {
  #terminal = null;

  constructor(terminal) {
    this.#terminal = terminal;
    const OdooVer = getOdooVersionMajor();
    if (OdooVer <= 11) {
      this.#getBusService().on('notification', this, this.#onBusNotification);
    } else if (OdooVer >= 16) {
      this.#busServ(
        'addEventListener',
        'notification',
        this.#onBusNotification.bind(this),
      );
    } else {
      this.#busServ('onNotification', this, this.#onBusNotification);
    }
  }

  #getBusService() {
    return getOdooService('bus.bus')?.bus;
  }

  #busServ(method, ...params) {
    const OdooVer = getOdooVersionMajor();
    if (OdooVer >= 14) {
      const bus_serv = getOdooEnv()?.services?.bus_service;
      if (!bus_serv) {
        throw new Error('bus service not available');
      }
      return bus_serv[method](...params);
    }
    return doCall('bus_service', method, ...params);
  }

  addChannel(name) {
    const OdooVer = getOdooVersionMajor();
    if (OdooVer <= 11) {
      return this.#getBusService().add_channel(name);
    }
    return this.#busServ('addChannel', name);
  }

  deleteChannel(name) {
    const OdooVer = getOdooVersionMajor();
    if (OdooVer <= 11) {
      return this.#getBusService().delete_channel(name);
    }
    return this.#busServ('deleteChannel', name);
  }

  startPoll() {
    const OdooVer = getOdooVersionMajor();
    if (OdooVer <= 11) {
      return this.#getBusService().start_polling();
    } else if (OdooVer >= 16) {
      return this.#busServ('forceUpdateChannels');
    }
    return this.#busServ('startPolling');
  }

  stopPoll() {
    const OdooVer = getOdooVersionMajor();
    if (OdooVer <= 11) {
      return this.#getBusService().stop_polling();
    } else if (OdooVer >= 16) {
      return this.#busServ('stop');
    }
    return this.#busServ('stopPolling');
  }

  setVerbose(status) {
    if (status) {
      setStorageItem('terminal_longpolling_mode', 'verbose', err =>
        this.screen.print(err),
      );
    } else {
      removeStorageItem('terminal_longpolling_mode');
    }
  }

  isVerbose() {
    return getStorageItem('terminal_longpolling_mode') === 'verbose';
  }

  //
  #getNotificationsData(data) {
    const OdooVer = getOdooVersionMajor();
    if (OdooVer >= 16) {
      return data.detail;
    }
    return data;
  }
  #onBusNotification(data) {
    if (this.isVerbose()) {
      this.#terminal.onBusNotification(this.#getNotificationsData(data));
    }
  }
}
