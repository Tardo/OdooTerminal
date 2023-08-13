// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

class StorageBase {
  /**
   * Return a friendly error exception
   *
   * @param {Exception} err
   * @returns {Boolean}
   */
  static checkError(err) {
    if (err.name !== "QuotaExceededError") {
      return false;
    }
    return (
      "<span style='color:navajowhite'>" +
      "<strong>WARNING:</strong> Clear the " +
      "<b class='o_terminal_click o_terminal_cmd' " +
      "data-cmd='clear screen' style='color:orange;'>screen</b> " +
      "or/and " +
      "<b class='o_terminal_click o_terminal_cmd' " +
      "data-cmd='clear history' style='color:orange;'>" +
      "history</b> " +
      "to free storage space. Browser <u>Storage Quota Exceeded</u>" +
      " 😭 </strong><br>"
    );
  }
}

export class StorageSession extends StorageBase {
  getItem(item, def_value) {
    const res = sessionStorage.getItem(item);
    if (res === null) {
      return def_value;
    }
    return JSON.parse(res);
  }

  setItem(item, value, on_error = false) {
    try {
      return sessionStorage.setItem(item, JSON.stringify(value));
    } catch (err) {
      if (on_error) {
        const err_check = this.checkError(err);
        if (err_check) {
          on_error(err_check);
        }
      }
    }

    return false;
  }

  removeItem(item) {
    return sessionStorage.removeItem(item) || undefined;
  }
}

export class StorageLocal extends StorageBase {
  getItem(item, def_value) {
    const res = localStorage.getItem(item);
    if (res === null) {
      return def_value;
    }
    return JSON.parse(res);
  }

  setItem(item, value, on_error = false) {
    try {
      return localStorage.setItem(item, JSON.stringify(value));
    } catch (err) {
      if (on_error) {
        const err_check = this.checkError(err);
        if (err_check) {
          on_error(err_check);
        }
      }
    }

    return false;
  }

  removeItem(item) {
    return localStorage.removeItem(item) || undefined;
  }
}
