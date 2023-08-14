// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import rpc from "@odoo/rpc";
import {getOdooSession} from "@odoo/utils";

const session = getOdooSession();

async function cmdShowDBList(kwargs) {
  const _onSuccess = (databases) => {
    const databases_len = databases.length;
    if (!databases_len) {
      // Soft-Error
      this.screen.printError("Can't get database names");
      return;
    }
    // Search active database
    let index = 0;
    const s_databases = [];
    while (index < databases_len) {
      const database = databases[index];
      if (kwargs.only_active) {
        if (database === session.db) {
          this.screen.eprint(database);
          return database;
        }
      } else if (database === session.db) {
        s_databases.push(`<strong>${database}</strong> (Active Database)`);
      } else {
        s_databases.push(database);
      }
      ++index;
    }

    if (kwargs.only_active) {
      return false;
    }
    this.screen.print(s_databases);
    return databases;
  };
  const _onError = (err) => {
    if (!kwargs.only_active) {
      throw err;
    }
    // Heuristic way to determine the database name
    return rpc
      .query({
        route: "/websocket/peek_notifications",
        params: [
          ["channels", []],
          ["last", 9999999],
          ["is_first_poll", true],
        ],
      })
      .then((result) => {
        if (result.channels[0]) {
          const dbname = result.channels[0][0];
          this.screen.eprint(dbname);
          return dbname;
        }
        return false;
      });
  };
  const queryParams = {
    route: "/jsonrpc",
    params: {
      service: "db",
      method: "list",
      args: {},
    },
  };

  // Check if using deferred jquery or native promises
  const prom = rpc.query(queryParams);
  if ("catch" in prom) {
    return prom.then(_onSuccess).catch(_onError);
  }
  return prom.then(_onSuccess).fail(_onError);
}

export default {
  definition: "Show database names",
  callback: cmdShowDBList,
  detail: "Show database names",
  args: [
    [
      ARG.Flag,
      ["oa", "only-active"],
      false,
      "Indicates that only print the active database name",
    ],
  ],
};
