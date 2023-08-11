// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import Recordset from "../../terminal/core/recordset.mjs";
import {
  renderMetadata,
  renderRecordCreated,
  renderWhoami,
  renderWhoamiListItem,
} from "../../terminal/core/template_manager.mjs";
import {ARG} from "../../terminal/trash/constants.mjs";
import {asyncSleep, isEmpty} from "../../terminal/core/utils.mjs";
import rpc from "../rpc.mjs";
import {doAction} from "../root.mjs";
import {
  getOdooService,
  getOdooSession,
  getOdooVersionInfo,
  getOdooVersionMajor,
  getUID,
} from "../utils.mjs";

const session = getOdooSession();

function searchModules(module_names) {
  const payload = {
    method: "search_read",
    model: "ir.module.module",
    kwargs: {context: this.getContext()},
    fields: ["name", "display_name"],
  };
  if (module_names && module_names.constructor === String) {
    payload.domain = [["name", "=", module_names]];
  } else if (module_names.length === 1) {
    payload.domain = [["name", "=", module_names[0]]];
  } else {
    payload.domain = [["name", "in", module_names]];
  }
  return rpc.query(payload);
}

function longPollingAddChannel(name) {
  if (typeof name === "undefined") {
    this.screen.printError("Invalid channel name.");
  } else {
    this.longpolling.addChannel(name);
    this.screen.print(`Joined the '${name}' channel.`);
  }
}

function longPollingDelChannel(name) {
  if (typeof name === "undefined") {
    this.screen.printError("Invalid channel name.");
  } else {
    this.longpolling.deleteChannel(name);
    this.screen.print(`Leave the '${name}' channel.`);
  }
}

function cmdGen(kwargs) {
  this.parameterGenerator.resetStores();
  const type = kwargs.type.toLowerCase();
  let result = false;
  if (type === "email") {
    result = this.parameterGenerator.generateEmail(kwargs.min, kwargs.max);
  } else if (type === "url") {
    result = this.parameterGenerator.generateUrl(kwargs.min, kwargs.max);
  } else if (type === "float") {
    result = this.parameterGenerator.generateFloat(kwargs.min, kwargs.max);
  } else if (type === "int") {
    result = this.parameterGenerator.generateInt(kwargs.min, kwargs.max);
  } else if (type === "intseq") {
    result = this.parameterGenerator.generateIntSeq(kwargs.min, kwargs.max);
  } else if (type === "intiter") {
    result = this.parameterGenerator.doIntIter(kwargs.min, kwargs.max);
  } else if (type === "str") {
    result = this.parameterGenerator.generateString(kwargs.min, kwargs.max);
  } else if (type === "tzdate") {
    result = this.parameterGenerator.generateTzDate(kwargs.min, kwargs.max);
  } else if (type === "date") {
    result = this.parameterGenerator.generateDate(kwargs.min, kwargs.max);
  } else if (type === "tztime") {
    result = this.parameterGenerator.generateTzTime(kwargs.min, kwargs.max);
  } else if (type === "time") {
    result = this.parameterGenerator.generateTime(kwargs.min, kwargs.max);
  } else if (type === "tzdatetime") {
    result = this.parameterGenerator.generateTzDateTime(kwargs.min, kwargs.max);
  } else if (type === "datetime") {
    result = this.parameterGenerator.generateDateTime(kwargs.min, kwargs.max);
  }
  this.screen.print(result);
  return Promise.resolve(result);
}

function cmdCreateModelRecord(kwargs) {
  if (typeof kwargs.value === "undefined") {
    return doAction({
      type: "ir.actions.act_window",
      res_model: kwargs.model,
      views: [[false, "form"]],
      target: "current",
    }).then(() => {
      this.doHide();
    });
  }
  return new Promise(async (resolve, reject) => {
    try {
      const result = await rpc.query({
        method: "create",
        model: kwargs.model,
        args: [kwargs.value],
        kwargs: {context: this.getContext()},
      });
      this.screen.print(
        renderRecordCreated({
          model: kwargs.model,
          new_id: result,
        })
      );
      return resolve(
        Recordset.make(kwargs.model, [
          Object.assign({}, kwargs.value, {id: result}),
        ])
      );
    } catch (err) {
      return reject(err);
    }
  });
}

function cmdUnlinkModelRecord(kwargs) {
  return rpc
    .query({
      method: "unlink",
      model: kwargs.model,
      args: [kwargs.id],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      this.screen.print(`${kwargs.model} record deleted successfully`);
      return result;
    });
}

function cmdWriteModelRecord(kwargs) {
  if (kwargs.value.constructor !== Object) {
    Promise.reject("Invalid values!");
  }
  return rpc
    .query({
      method: "write",
      model: kwargs.model,
      args: [kwargs.id, kwargs.value],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      this.screen.print(`${kwargs.model} record updated successfully`);
      return result;
    });
}

function cmdSearchModelRecord(kwargs) {
  const lines_total = this.screen._max_lines - 3;
  const fields = kwargs.field[0] === "*" ? false : kwargs.field;

  if (kwargs.more) {
    const buff = this._buffer[this.__meta.name];
    if (!buff || !buff.data.length) {
      return Promise.reject("There are no more results to print");
    }
    const sresult = buff.data.slice(0, lines_total);
    buff.data = buff.data.slice(lines_total);
    this.screen.printRecords(buff.model, sresult);
    if (buff.data.length) {
      this.screen.printError(
        `<strong class='text-warning'>Result truncated to ${sresult.length} records!</strong> The query is too big to be displayed entirely.`
      );
      return new Promise(async (resolve, reject) => {
        try {
          const res = await this.screen.showQuestion(
            `There are still results to print (${buff.data.length} records). Show more?`,
            ["y", "n"],
            "y"
          );
          if (res === "y") {
            this.execute(`search -m ${buff.model} --more`, false, false);
          }
        } catch (err) {
          return reject(err);
        }
        return resolve(sresult);
      });
    }
    return Promise.resolve(sresult);
  }

  return rpc
    .query({
      method: "search_read",
      domain: kwargs.domain,
      fields: fields,
      model: kwargs.model,
      limit: kwargs.limit,
      offset: kwargs.offset,
      orderBy: kwargs.order,
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      const need_truncate =
        !this.__meta.silent && !kwargs.all && result.length > lines_total;
      let sresult = result;
      if (need_truncate) {
        this._buffer[this.__meta.name] = {
          model: kwargs.model,
          data: sresult.slice(lines_total),
        };
        sresult = sresult.slice(0, lines_total);
      }
      this.screen.printRecords(kwargs.model, sresult);
      this.screen.print(`Records count: ${result.length}`);
      if (need_truncate) {
        this.screen.printError(
          `<strong class='text-warning'>Result truncated to ${sresult.length} records!</strong> The query is too big to be displayed entirely.`
        );
        return new Promise(async (resolve, reject) => {
          try {
            const res = await this.screen.showQuestion(
              `There are still results to print (${
                this._buffer[this.__meta.name].data.length
              } records). Show more?`,
              ["y", "n"],
              "y"
            );
            if (res === "y") {
              this.execute(`search -m ${kwargs.model} --more`, false, false);
            }
          } catch (err) {
            return reject(err);
          }
          return resolve(Recordset.make(kwargs.model, sresult));
        });
      }
      return Recordset.make(kwargs.model, result);
    });
}

function cmdCallModelMethod(kwargs) {
  const pkwargs = kwargs.kwarg;
  if (typeof pkwargs.context === "undefined") {
    pkwargs.context = this.getContext();
  }
  return rpc
    .query({
      method: kwargs.call,
      model: kwargs.model,
      args: kwargs.argument,
      kwargs: pkwargs,
    })
    .then((result) => {
      this.screen.eprint(result, false, "line-pre");
      return result;
    });
}

function cmdUpgradeModule(kwargs) {
  return new Promise((resolve, reject) => {
    searchModules
      .bind(this)(kwargs.module)
      .then((result) => {
        if (result.length) {
          return rpc
            .query({
              method: "button_immediate_upgrade",
              model: "ir.module.module",
              args: [result.map((item) => item.id)],
            })
            .then(
              () => {
                this.screen.print(
                  `'${result.length}' modules successfully upgraded`
                );
                resolve(result[0]);
              },
              (res) => reject(res.message.data.message)
            );
        }
        reject(`'${kwargs.module}' modules doesn't exists`);
      });
  });
}

function cmdInstallModule(kwargs) {
  return new Promise((resolve, reject) => {
    searchModules
      .bind(this)(kwargs.module)
      .then((result) => {
        if (result.length) {
          return rpc
            .query({
              method: "button_immediate_install",
              model: "ir.module.module",
              args: [result.map((item) => item.id)],
            })
            .then(
              () => {
                this.screen.print(
                  `'${result.length}' modules successfully installed`
                );
                resolve(result);
              },
              (res) => reject(res.message.data.message)
            );
        }
        return reject(`'${kwargs.module}' modules doesn't exists`);
      });
  });
}

function cmdUninstallModule(kwargs) {
  return new Promise(async (resolve, reject) => {
    try {
      const modue_infos = await searchModules.bind(this)(kwargs.module);
      if (!isEmpty(modue_infos)) {
        if (!kwargs.force) {
          let depends = await this.execute(
            `depends -m ${kwargs.module}`,
            false,
            true
          );
          if (isEmpty(depends)) {
            return resolve();
          }
          depends = depends.filter((item) => item !== kwargs.module);
          if (!isEmpty(depends)) {
            this.screen.print("This operation will remove these modules too:");
            this.screen.print(depends);
            const res = await this.screen.showQuestion(
              "Do you want to continue?",
              ["y", "n"],
              "n"
            );
            if (res?.toLowerCase() !== "y") {
              this.screen.printError("Operation cancelled");
              return resolve(false);
            }
          }
        }

        await rpc.query({
          method: "button_immediate_uninstall",
          model: "ir.module.module",
          args: [modue_infos[0].id],
        });

        this.screen.print(
          `'${kwargs.module}' (${modue_infos[0].display_name}) module successfully uninstalled`
        );
        return resolve(modue_infos[0]);
      }
    } catch (err) {
      return reject(err);
    }
    return reject(`'${kwargs.module}' module doesn't exists`);
  });
}

function cmdReloadPage() {
  location.reload();
  return Promise.resolve();
}

function cmdSetDebugMode(kwargs) {
  if (kwargs.mode === 0) {
    this.screen.print(
      "Debug mode <strong>disabled</strong>. Reloading page..."
    );
    const qs = $.deparam.querystring();
    delete qs.debug;
    window.location.search = "?" + $.param(qs);
  } else if (kwargs.mode === 1) {
    this.screen.print("Debug mode <strong>enabled</strong>. Reloading page...");
    window.location = $.param.querystring(window.location.href, "debug=1");
  } else if (kwargs.mode === 2) {
    this.screen.print(
      "Debug mode with assets <strong>enabled</strong>. " + "Reloading page..."
    );
    window.location = $.param.querystring(window.location.href, "debug=assets");
  } else {
    return Promise.reject("Invalid debug mode");
  }
  return Promise.resolve();
}

function cmdPostData(kwargs) {
  if (kwargs.mode === "odoo") {
    return getOdooService("web.ajax")
      .post(kwargs.endpoint, kwargs.data)
      .then((result) => {
        this.screen.eprint(result, false, "line-pre");
        return result;
      });
  }
  return $.post(kwargs.endpoint, kwargs.data, (result) => {
    this.screen.eprint(result, false, "line-pre");
    return result;
  });
}

function cmdShowWhoAmI() {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await rpc.query({
        method: "search_read",
        domain: [["id", "=", getUID()]],
        fields: [
          "id",
          "display_name",
          "login",
          "partner_id",
          "company_id",
          "company_ids",
          "groups_id",
        ],
        model: "res.users",
        kwargs: {context: this.getContext()},
      });
      if (!result.length) {
        return reject("Oops! can't get the login :/");
      }
      const record = result[0];
      const result_tasks = await Promise.all([
        rpc.query({
          method: "name_get",
          model: "res.groups",
          args: [record.groups_id],
          kwargs: {context: this.getContext()},
        }),
        rpc.query({
          method: "name_get",
          model: "res.company",
          args: [record.company_ids],
          kwargs: {context: this.getContext()},
        }),
      ]);
      let groups_list = "";
      for (const group of result_tasks[0]) {
        groups_list += renderWhoamiListItem({
          name: group[1],
          model: "res.groups",
          id: group[0],
        });
      }
      let companies_list = "";
      for (const company of result_tasks[1]) {
        companies_list += renderWhoamiListItem({
          name: company[1],
          model: "res.company",
          id: company[0],
        });
      }
      const template_values = {
        login: record.login,
        display_name: record.display_name,
        user_id: record.id,
        partner: record.partner_id,
        company: record.company_id,
        companies: companies_list,
        groups: groups_list,
      };
      this.screen.print(renderWhoami(template_values));
      return resolve(template_values);
    } catch (err) {
      return reject(err);
    }
  });
}

function cmdCheckFieldAccess(kwargs) {
  const fields = kwargs.field[0] === "*" ? false : kwargs.field;
  return rpc
    .query({
      method: "fields_get",
      model: kwargs.model,
      args: [fields],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      let s_result = null;
      const keys = Object.keys(result);
      if (isEmpty(kwargs.filter)) {
        s_result = result;
      } else {
        s_result = [];
        const fkeys = Object.keys(kwargs.filter);
        for (const fkey of fkeys) {
          for (const key of keys) {
            if (
              Object.hasOwn(result[key], fkey) &&
              result[key][fkey] === kwargs.filter[fkey]
            ) {
              s_result[key] = result[key];
            }
          }
        }
      }
      const s_keys = Object.keys(s_result).sort();
      const fieldParams = [
        "type",
        "string",
        "relation",
        "required",
        "readonly",
        "searchable",
        "translate",
        "depends",
      ];
      let body = "";
      const len = s_keys.length;
      for (let x = 0; x < len; ++x) {
        const field = s_keys[x];
        const fieldDef = s_result[field];
        body += "<tr>";
        if (fieldDef.required) {
          body += `<td>* <b style='color:mediumslateblue'>${field}</b></td>`;
        } else {
          body += `<td>${field}</td>`;
        }
        const l2 = fieldParams.length;
        for (let x2 = 0; x2 < l2; ++x2) {
          let value = fieldDef[fieldParams[x2]];
          if (typeof value === "undefined" || value === null) {
            value = "";
          }
          body += `<td>${value}</td>`;
        }
        body += "</tr>";
      }
      fieldParams.unshift("field");
      this.screen.printTable(fieldParams, body);
      return s_result;
    });
}

function cmdCheckModelAccess(kwargs) {
  return rpc
    .query({
      method: "check_access_rights",
      model: kwargs.model,
      args: [kwargs.operation, false],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      if (result) {
        this.screen.print(
          `You have access rights for '${kwargs.operation}' on ${kwargs.model}`
        );
      } else {
        this.screen.print(`You can't '${kwargs.operation}' on ${kwargs.model}`);
      }
      return result;
    });
}

function cmdLastSeen() {
  if (!this.longpolling) {
    return Promise.reject("Can't use lastseen, 'bus' module is not installed");
  }
  return rpc
    .query({
      method: "search_read",
      fields: ["user_id", "last_presence"],
      model: "bus.presence",
      orderBy: "last_presence DESC",
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      let body = "";
      const len = result.length;
      for (let x = 0; x < len; ++x) {
        const record = result[x];
        body +=
          `<tr><td>${record.user_id[1]}</td>` +
          `<td>${record.user_id[0]}</td>` +
          `<td>${record.last_presence}</td></tr>`;
      }
      this.screen.printTable(["User Name", "User ID", "Last Seen"], body);
      return result;
    });
}

function cmdSearchModelRecordId(kwargs) {
  const fields = kwargs.field[0] === "*" ? false : kwargs.field;
  return rpc
    .query({
      method: "search_read",
      domain: [["id", "in", kwargs.id]],
      fields: fields,
      model: kwargs.model,
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      this.screen.printRecords(kwargs.model, result);
      return Recordset.make(kwargs.model, result);
    });
}

function cmdContextOperation(kwargs) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 15) {
    if (
      kwargs.operation === "set" ||
      kwargs.operation === "write" ||
      kwargs.operation === "delete"
    ) {
      return Promise.reject(
        "This operation is currently not supported in v15.0+"
      );
    }
  }

  if (kwargs.operation === "set") {
    session.user_context = kwargs.value;
  } else if (kwargs.operation === "write") {
    Object.assign(session.user_context, kwargs.value);
  } else if (kwargs.operation === "delete") {
    if (Object.hasOwn(session.user_context, kwargs.value)) {
      delete session.user_context[kwargs.value];
    } else {
      return Promise.reject(
        "The selected key is not present in the terminal context"
      );
    }
  }
  this.screen.print(session.user_context);
  return Promise.resolve(session.user_context);
}

function cmdShowOdooVersion() {
  const version_info = getOdooVersionInfo();
  this.screen.print(
    `${version_info.slice(0, 3).join(".")} (${version_info.slice(3).join(" ")})`
  );
  return Promise.resolve();
}

function cmdLongpolling(kwargs) {
  if (!this.longpolling) {
    return Promise.reject(
      "Can't use longpolling, 'bus' module is not installed"
    );
  }

  if (typeof kwargs.operation === "undefined") {
    this.screen.print(this.longpolling.isVerbose() || "off");
  } else if (kwargs.operation === "verbose") {
    this.longpolling.setVerbose(true);
    this.screen.print("Now long-polling is in verbose mode.");
  } else if (kwargs.operation === "off") {
    this.longpolling.setVerbose(false);
    this.screen.print("Now long-polling verbose mode is disabled");
  } else if (kwargs.operation === "add_channel") {
    longPollingAddChannel(kwargs.param);
  } else if (kwargs.operation === "del_channel") {
    longPollingDelChannel(kwargs.param);
  } else if (kwargs.operation === "start") {
    this.longpolling.startPoll();
    this.screen.print("Longpolling started");
  } else if (kwargs.operation === "stop") {
    this.longpolling.stopPoll();
    this.screen.print("Longpolling stopped");
  } else {
    return Promise.reject("Invalid Operation.");
  }
  return Promise.resolve();
}

function cmdLoginAs(kwargs) {
  let db = kwargs.database;
  let login = kwargs.user;
  let passwd = kwargs.password || false;
  if (login[0] === "#" && !passwd) {
    login = login.substr(1);
    passwd = login;
  }
  if (db === "*") {
    if (!session.db) {
      return Promise.reject(
        "Unknown active database. Try using " +
          "'<span class='o_terminal_click o_terminal_cmd' " +
          "data-cmd='dblist'>dblist</span>' command."
      );
    }
    db = session.db;
  }
  return new Promise(async (resolve, reject) => {
    const res = await session._session_authenticate(db, login, passwd);
    this.screen.updateInputInfo({username: login});
    this.screen.print(`Successfully logged as '${login}'`);
    if (!kwargs.no_reload) {
      try {
        this.execute("reload", false, true);
      } catch (err) {
        return reject(err);
      }
    }
    return resolve(res);
  });
}

function cmdUserHasGroups(kwargs) {
  return rpc
    .query({
      method: "user_has_groups",
      model: "res.users",
      args: [kwargs.group.join(",")],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      this.screen.print(result);
      return result;
    });
}

function cmdShowDBList(kwargs) {
  const _onSuccess = (databases) => {
    const databases_len = databases.length;
    if (!databases_len) {
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

function cmdJSTest(kwargs) {
  let mod = kwargs.module || "";
  if (kwargs.module === "*") {
    mod = "";
  }
  let url = "/web/tests";
  if (kwargs.device === "mobile") {
    url += "/mobile";
  }
  url += `?module=${mod}`;
  window.location = url;
  return Promise.resolve();
}

function cmdRunTour(kwargs) {
  // Loaded in this way because 'tour' is not initialized on mobile mode.
  const tour = getOdooService("web_tour.tour");
  if (!tour) {
    return Promise.reject("tour not accesible! Can't use this command now.");
  }
  const tour_names = Object.keys(tour.tours);
  if (kwargs.name) {
    if (tour_names.indexOf(kwargs.name) === -1) {
      return Promise.reject("The given tour doesn't exists!");
    }
    tour.run(kwargs.name);
    this.screen.print("Running tour...");
  } else if (tour_names.length) {
    this.screen.print(tour_names);
    return Promise.resolve(tour_names);
  } else {
    this.screen.print("The tour list is empty");
  }
  return Promise.resolve();
}

function cmdPostJSONData(kwargs) {
  return rpc
    .query({
      route: kwargs.endpoint,
      params: kwargs.data,
    })
    .then((result) => {
      this.screen.eprint(result, false, "line-pre");
      return result;
    });
}

function sanitizeCmdModuleDepends(module_name) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 16) {
    return `_______${module_name}`;
  }
  return module_name;
}
function cmdModuleDepends(kwargs) {
  return rpc
    .query({
      method: "onchange_module",
      model: "res.config.settings",
      args: [false, false, sanitizeCmdModuleDepends(kwargs.module)],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      let depend_names = [];
      if (isEmpty(result)) {
        this.screen.printError(`The module '${kwargs.module}' isn't installed`);
      } else {
        depend_names = result.warning.message
          .substr(result.warning.message.search("\n") + 1)
          .split("\n");
        this.screen.print(depend_names);
        return depend_names;
      }
      return depend_names;
    });
}

function cmdUpdateAppList() {
  return rpc
    .query({
      method: "update_list",
      model: "ir.module.module",
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      if (result) {
        this.screen.print("The apps list has been updated successfully");
      } else {
        this.screen.printError("Can't update the apps list!");
      }
      return result;
    });
}

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

function cmdCount(kwargs) {
  return rpc
    .query({
      method: "search_count",
      model: kwargs.model,
      args: [kwargs.domain],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      this.screen.print(`Result: ${result}`);
      return result;
    });
}

function cmdRef(kwargs) {
  const tasks = [];
  for (const xmlid of kwargs.xmlid) {
    tasks.push(
      rpc
        .query({
          method: "xmlid_to_res_model_res_id",
          model: "ir.model.data",
          args: [xmlid],
          kwargs: {context: this.getContext()},
        })
        .then(
          function (active_xmlid, result) {
            return [active_xmlid, result[0], result[1]];
          }.bind(this, xmlid)
        )
    );
  }

  return Promise.all(tasks).then((results) => {
    let body = "";
    const len = results.length;
    for (let x = 0; x < len; ++x) {
      const item = results[x];
      body +=
        `<tr><td>${item[0]}</td>` +
        `<td>${item[1]}</td>` +
        `<td>${item[2]}</td></tr>`;
    }
    this.screen.printTable(["XML ID", "Res. Model", "Res. ID"], body);
    return results;
  });
}

function cmdRpc(kwargs) {
  return rpc.query(kwargs.options).then((result) => {
    this.screen.eprint(result);
    return result;
  });
}

function cmdMetadata(kwargs) {
  return new Promise(async (resolve, reject) => {
    let metadata = {};
    try {
      metadata = (
        await rpc.query({
          method: "get_metadata",
          model: kwargs.model,
          args: [[kwargs.id]],
          kwargs: {context: this.getContext()},
        })
      )[0];

      if (typeof metadata === "undefined") {
        this.screen.print("Can't found any metadata for the given id");
      } else {
        this.screen.print(renderMetadata(metadata));
      }
    } catch (err) {
      return reject(err);
    }
    return resolve(metadata);
  });
}

const AVAILABLE_BARCODE_COMMANDS = [
  "O-CMD.EDIT",
  "O-CMD.DISCARD",
  "O-CMD.SAVE",
  "O-CMD.PREV",
  "O-CMD.NEXT",
  "O-CMD.PAGER-FIRST",
  "O-CMD.PAGER-LAST",
];
function getBarcodeEvent(data) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 16) {
    return new KeyboardEvent("keydown", {
      key: data,
    });
  }
  const keyCode = data.charCodeAt(0);
  return new KeyboardEvent("keypress", {
    keyCode: keyCode,
    which: keyCode,
  });
}
function getBarcodeInfo(barcodeService) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 16) {
    return [
      `Max. time between keys (ms): ${barcodeService.barcodeService.maxTimeBetweenKeysInMs}`,
      "Reserved barcode prefixes: O-BTN., O-CMD.",
      `Available commands: ${this._AVAILABLE_BARCODE_COMMANDS.join(", ")}`,
    ];
  }
  return [
    `Max. time between keys (ms): ${barcodeService.BarcodeEvents.max_time_between_keys_in_ms}`,
    `Reserved barcode prefixes: ${barcodeService.ReservedBarcodePrefixes.join(
      ", "
    )}`,
    `Available commands: ${AVAILABLE_BARCODE_COMMANDS.join(", ")}`,
    `Currently accepting barcode scanning? ${
      barcodeService.BarcodeEvents.$barcodeInput.length > 0 ? "Yes" : "No"
    }`,
  ];
}
function cmdBarcode(kwargs) {
  // Soft-dependency... this don't exists if barcodes module is not installed
  const barcodeService = getOdooService(
    "barcodes.BarcodeEvents",
    "@barcodes/barcode_service"
  );
  if (!barcodeService) {
    return Promise.reject("The 'barcode' module is not installed/available");
  }
  return new Promise(async (resolve, reject) => {
    if (kwargs.operation === "info") {
      const info = getBarcodeInfo(barcodeService);
      this.screen.eprint(info);
      return resolve(info);
    } else if (kwargs.operation === "send") {
      if (!kwargs.data) {
        return reject("No data given!");
      }

      for (const barcode of kwargs.data) {
        for (let i = 0, bardoce_len = barcode.length; i < bardoce_len; i++) {
          document.body.dispatchEvent(getBarcodeEvent(barcode[i]));
          await asyncSleep(kwargs.pressdelay);
        }
        await asyncSleep(kwargs.barcodedelay);
      }
    } else {
      return reject("Invalid operation!");
    }
    return resolve(kwargs.data);
  });
}

function cmdWebSocket(kwargs) {
  if (kwargs.operation === "open") {
    if (!kwargs.endpoint) {
      return Promise.reject("Need an endpoint to connect");
    }
    const url = `ws${kwargs.no_tls ? "" : "s"}://${window.location.host}${
      kwargs.endpoint
    }`;
    const socket = new WebSocket(url);
    socket.onopen = () => {
      this.screen.print(`[${url}] Connection established`);
      socket.send("initialized");
    };
    socket.onmessage = (ev) => {
      this.screen.print(`[${url}] ${ev.data}`);
    };
    socket.onclose = (ev) => {
      if (ev.wasClean) {
        this.screen.print(
          `[${url}] Connection closed cleanly, code=${ev.code} reason=${ev.reason}`
        );
      } else {
        this.screen.print(`[${url}] Connection died`);
      }
    };
    socket.onerror = () => {
      this.screen.eprint(`[${url}] ERROR!`);
    };
    return Promise.resolve(socket);
  } else if (kwargs.operation === "send") {
    if (!kwargs.websocket || kwargs.websocket.constructor !== WebSocket) {
      return Promise.reject("Need a websocket to operate");
    }
    // { event_name: 'subscribe', data: { channels: allTabsChannels, last: this.lastNotificationId } }
    const payload = JSON.stringify(kwargs.data);
    this.screen.eprint(`Sending '${payload}'...`);
    kwargs.websocket.send(payload);
    return Promise.resolve();
  } else if (kwargs.operation === "close") {
    if (!kwargs.websocket || kwargs.websocket.constructor !== WebSocket) {
      return Promise.reject("Need a websocket to operate");
    }
    kwargs.websocket.close(kwargs.data);
    return Promise.resolve();
  } else if (kwargs.operation === "health") {
    kwargs.websocket.close(kwargs.data);
    return Promise.resolve();
  }
  return Promise.reject("Invalid operation");
}

function cmdCommit(kwargs) {
  return new Promise(async (resolve, reject) => {
    if (!Recordset.isValid(kwargs.recordset)) {
      return reject(`Invalid recordset`);
    }

    const values_to_write = kwargs.recordset.toWrite();
    if (isEmpty(values_to_write)) {
      this.screen.printError("Nothing to commit!");
      return resolve(false);
    }
    const pids = [];
    const tasks = [];
    for (const [rec_id, values] of values_to_write) {
      tasks.push(
        rpc.query({
          method: "write",
          model: kwargs.recordset.model,
          args: [rec_id, values],
          kwargs: {context: this.getContext()},
        })
      );
      pids.push(rec_id);
    }

    await Promise.all(tasks);
    kwargs.recordset.persist();
    this.screen.print(
      `Records '${pids}' of ${kwargs.recordset.model} updated successfully`
    );
    return resolve(true);
  });
}

function cmdRollback(kwargs) {
  return new Promise(async (resolve, reject) => {
    if (!Recordset.isValid(kwargs.recordset)) {
      return reject(`Invalid recordset`);
    }

    kwargs.recordset.rollback();
    this.screen.print(`Recordset changes undone`);
    return resolve(true);
  });
}

function cmdNow(kwargs) {
  const time = getOdooService("web.time");
  let res = false;
  if (kwargs.type === "full") {
    if (kwargs.tz) {
      res = moment().format(time.getLangDatetimeFormat());
    } else {
      res = time.datetime_to_str(new Date());
    }
  } else if (kwargs.type === "date") {
    if (kwargs.tz) {
      res = moment().format(time.getLangDateFormat());
    } else {
      res = time.date_to_str(new Date());
    }
  } else if (kwargs.type === "time") {
    if (kwargs.tz) {
      res = moment().format(time.getLangTimeFormat());
    } else {
      res = time.time_to_str(new Date());
    }
  }

  this.screen.print(res);
  return Promise.resolve(res);
}

export function registerCommonFuncs(TerminalObj) {
  TerminalObj.registerCommand("gen", {
    definition: "Generate numbers, strings, url's, dates, etc...",
    callback: cmdGen,
    detail: "Shows the bytecode generated for the input",
    args: [
      [
        ARG.String,
        ["t", "type"],
        true,
        "Generator type",
        "str",
        [
          "str",
          "float",
          "int",
          "intseq",
          "intiter",
          "date",
          "tzdate",
          "time",
          "tztime",
          "datetime",
          "tzdatetime",
          "email",
          "url",
        ],
      ],
      [ARG.Number, ["mi", "min"], false, "Min. value", 1],
      [ARG.Number, ["ma", "max"], false, "Max. value"],
    ],
    example: "-t str -mi 2 -ma 4",
  });
  TerminalObj.registerCommand("create", {
    definition: "Create new record",
    callback: cmdCreateModelRecord,
    detail: "Open new model record in form view or directly.",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [ARG.Dictionary, ["v", "value"], false, "The values to write"],
    ],
    example: "-m res.partner -v {name: 'Poldoore'}",
  });
  TerminalObj.registerCommand("unlink", {
    definition: "Unlink record",
    callback: cmdUnlinkModelRecord,
    detail: "Delete a record.",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [ARG.List | ARG.Number, ["i", "id"], true, "The record id's"],
    ],
    example: "-m res.partner -i 10,4,2",
  });
  TerminalObj.registerCommand("write", {
    definition: "Update record values",
    callback: cmdWriteModelRecord,
    detail: "Update record values.",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [ARG.List | ARG.Number, ["i", "id"], true, "The record id's"],
      [ARG.Dictionary, ["v", "value"], true, "The values to write"],
    ],
    example: "-m res.partner -i 10,4,2 -v {street: 'Diagon Alley'}",
  });
  TerminalObj.registerCommand("search", {
    definition: "Search model record/s",
    callback: cmdSearchModelRecord,
    detail: "Launch orm search query",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [
        ARG.List | ARG.String,
        ["f", "field"],
        false,
        "The field names to request<br/>Can use '*' to show all fields of the model",
        ["display_name"],
      ],
      [ARG.List | ARG.Any, ["d", "domain"], false, "The domain", []],
      [ARG.Number, ["l", "limit"], false, "The limit of records to request"],
      [
        ARG.Number,
        ["of", "offset"],
        false,
        "The offset (from)<br/>Can be zero (no limit)",
      ],
      [
        ARG.String,
        ["o", "order"],
        false,
        "The order<br/>A list of orders separated by comma (Example: 'age DESC, email')",
      ],
      [
        ARG.Flag,
        ["more", "more"],
        false,
        "Flag to indicate that show more results",
      ],
      [ARG.Flag, ["all", "all"], false, "Show all records (not truncated)"],
    ],
    example: "-m res.partner -f * -l 100 -of 5 -o 'id DESC, name'",
  });
  TerminalObj.registerCommand("call", {
    definition: "Call model method",
    callback: cmdCallModelMethod,
    detail:
      "Call model method. Remember: Methods with @api.model decorator doesn't need the id.",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [ARG.String, ["c", "call"], true, "The method name to call"],
      [ARG.List | ARG.Any, ["a", "argument"], false, "The arguments list", []],
      [ARG.Dictionary, ["k", "kwarg"], false, "The arguments dictionary", {}],
    ],
    example: "-m res.partner -c address_get -a [8]",
  });
  TerminalObj.registerCommand("upgrade", {
    definition: "Upgrade a module",
    callback: cmdUpgradeModule,
    detail: "Launch upgrade module process.",
    args: [
      [
        ARG.List | ARG.String,
        ["m", "module"],
        true,
        "The module technical name",
      ],
    ],
    example: "-m contacts",
  });
  TerminalObj.registerCommand("install", {
    definition: "Install a module",
    callback: cmdInstallModule,
    detail: "Launch module installation process.",
    args: [
      [
        ARG.List | ARG.String,
        ["m", "module"],
        true,
        "The module technical name",
      ],
    ],
    example: "-m contacts",
  });
  TerminalObj.registerCommand("uninstall", {
    definition: "Uninstall a module",
    callback: cmdUninstallModule,
    detail: "Launch module deletion process.",
    args: [
      [ARG.String, ["m", "module"], true, "The module technical name"],
      [ARG.Flag, ["f", "force"], false, "Forced mode"],
    ],
    exmaple: "-m contacts",
  });
  TerminalObj.registerCommand("reload", {
    definition: "Reload current page",
    callback: cmdReloadPage,
    detail: "Reload current page.",
  });
  TerminalObj.registerCommand("debug", {
    definition: "Set debug mode",
    callback: cmdSetDebugMode,
    detail: "Set debug mode",
    args: [
      [
        ARG.Number,
        ["m", "mode"],
        true,
        "The mode<br>- 0: Disabled<br>- 1: Enabled<br>- 2: Enabled with Assets",
        undefined,
        [0, 1, 2],
      ],
    ],
    example: "-m 2",
  });
  TerminalObj.registerCommand("post", {
    definition: "Send POST request",
    callback: cmdPostData,
    detail: "Send POST request to selected endpoint",
    args: [
      [ARG.String, ["e", "endpoint"], true, "The endpoint"],
      [ARG.Any, ["d", "data"], true, "The data"],
      [ARG.String, ["m", "mode"], false, "The mode", "odoo", ["odoo", "raw"]],
    ],
    example: "-e /web/endpoint -d {the_example: 42}",
  });
  TerminalObj.registerCommand("whoami", {
    definition: "Know current user login",
    callback: cmdShowWhoAmI,
    detail: "Shows current user login",
  });
  TerminalObj.registerCommand("caf", {
    definition: "Check model fields access",
    callback: cmdCheckFieldAccess,
    detail: "Show readable/writeable fields of the selected model",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [
        ARG.List | ARG.String,
        ["f", "field"],
        false,
        "The field names to request",
        ["*"],
      ],
      [ARG.Dictionary, ["fi", "filter"], false, "The filter to apply"],
    ],
    example: "-m res.partner -f name,street",
  });
  TerminalObj.registerCommand("cam", {
    definition: "Check model access",
    callback: cmdCheckModelAccess,
    detail:
      "Show access rights for the selected operation on the" +
      " selected model",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [
        ARG.String,
        ["o", "operation"],
        true,
        "The operation to do",
        undefined,
        ["create", "read", "write", "unlink"],
      ],
    ],
    example: "-m res.partner -o read",
  });
  TerminalObj.registerCommand("lastseen", {
    definition: "Know user presence",
    callback: cmdLastSeen,
    detail: "Show users last seen",
  });
  TerminalObj.registerCommand("read", {
    definition: "Search model record",
    callback: cmdSearchModelRecordId,
    detail: "Launch orm search query.",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [ARG.List | ARG.Number, ["i", "id"], true, "The record id's"],
      [
        ARG.List | ARG.String,
        ["f", "field"],
        false,
        "The fields to request<br/>Can use '*' to show all fields",
        ["display_name"],
      ],
    ],
    example: "-m res.partner -i 10,4,2 -f name,street",
  });
  TerminalObj.registerCommand("context", {
    definition: "Operations over session context dictionary",
    callback: cmdContextOperation,
    detail: "Operations over session context dictionary.",
    args: [
      [
        ARG.String,
        ["o", "operation"],
        false,
        "The operation to do",
        "read",
        ["read", "write", "set", "delete"],
      ],
      [ARG.Any, ["v", "value"], false, "The values"],
    ],
    example: "-o write -v {the_example: 1}",
  });
  TerminalObj.registerCommand("version", {
    definition: "Know Odoo version",
    callback: cmdShowOdooVersion,
    detail: "Shows Odoo version",
  });
  TerminalObj.registerCommand("longpolling", {
    definition: "Long-Polling operations",
    callback: cmdLongpolling,
    detail: "Operations over long-polling.",
    args: [
      [
        ARG.String,
        ["o", "operation"],
        false,
        "The operation to do<br>- verbose > Print incoming notificacions<br>- off > Stop verbose mode<br>- add_channel > Add a channel to listen<br>- del_channel > Delete a listening channel<br>- start > Start client longpolling service<br> - stop > Stop client longpolling service",
        undefined,
        ["verbose", "off", "add_channel", "del_channel", "start", "stop"],
      ],
      [ARG.String, ["p", "param"], false, "The parameter"],
    ],
    example: "add_channel example_channel",
  });
  TerminalObj.registerCommand("login", {
    definition: "Login as...",
    callback: cmdLoginAs,
    detail: "Login as selected user.",
    args: [
      [
        ARG.String,
        ["d", "database"],
        true,
        "The database<br/>Can be '*' to use current database",
      ],
      [
        ARG.String,
        ["u", "user"],
        true,
        "The login<br/>Can be optionally preceded by the '#' character and it will be used for password too",
      ],
      [ARG.String, ["p", "password"], false, "The password"],
      [ARG.Flag, ["nr", "no-reload"], false, "No reload"],
    ],
    secured: true,
    example: "-d devel -u #admin",
  });
  TerminalObj.registerCommand("uhg", {
    definition: "Check if user is in the selected groups",
    callback: cmdUserHasGroups,
    detail: "Check if user is in the selected groups.",
    args: [
      [
        ARG.List | ARG.String,
        ["g", "group"],
        true,
        "The technical name of the group<br/>A group can be optionally preceded by '!' to say 'is not in group'",
      ],
    ],
    example: "-g base.group_user",
  });
  TerminalObj.registerCommand("dblist", {
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
  });
  TerminalObj.registerCommand("jstest", {
    definition: "Launch JS Tests",
    callback: cmdJSTest,
    detail: "Runs js tests in desktop or mobile mode for the selected module.",
    args: [
      [ARG.String, ["m", "module"], false, "The module technical name"],
      [
        ARG.String,
        ["d", "device"],
        false,
        "The device to test",
        "desktop",
        ["desktop", "mobile"],
      ],
    ],
    example: "-m web -d mobile",
  });
  TerminalObj.registerCommand("tour", {
    definition: "Launch Tour",
    callback: cmdRunTour,
    detail:
      "Runs the selected tour. If no tour given, prints all available tours.",
    args: [[ARG.String, ["n", "name"], false, "The tour technical name"]],
    example: "-n mail_tour",
  });
  TerminalObj.registerCommand("json", {
    definition: "Send POST JSON",
    callback: cmdPostJSONData,
    detail: "Sends HTTP POST 'application/json' request",
    args: [
      [ARG.String, ["e", "endpoint"], true, "The endpoint"],
      [ARG.Any, ["d", "data"], true, "The data to send"],
    ],
    example: "-e /web_editor/public_render_template -d {args: ['web.layout']}",
  });
  TerminalObj.registerCommand("depends", {
    definition: "Know modules that depends on the given module",
    callback: cmdModuleDepends,
    detail: "Show a list of the modules that depends on the given module",
    args: [[ARG.String, ["m", "module"], false, "The module technical name"]],
    example: "base",
  });
  TerminalObj.registerCommand("ual", {
    definition: "Update apps list",
    callback: cmdUpdateAppList,
    detail: "Update apps list",
  });
  TerminalObj.registerCommand("logout", {
    definition: "Log out",
    callback: cmdLogOut,
    detail: "Session log out",
  });
  TerminalObj.registerCommand("count", {
    definition:
      "Gets number of records from the given model in the selected domain",
    callback: cmdCount,
    detail:
      "Gets number of records from the given model in the selected domain",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [ARG.List | ARG.Any, ["d", "domain"], false, "The domain", []],
    ],
    example: "res.partner ['name', '=ilike', 'A%']",
  });
  TerminalObj.registerCommand("ref", {
    definition: "Show the referenced model and id of the given xmlid's",
    callback: cmdRef,
    detail: "Show the referenced model and id of the given xmlid's",
    args: [[ARG.List | ARG.String, ["x", "xmlid"], true, "The XML-ID"]],
    example: "-x base.main_company,base.model_res_partner",
  });
  TerminalObj.registerCommand("rpc", {
    definition: "Execute raw rpc",
    callback: cmdRpc,
    detail: "Execute raw rpc",
    args: [[ARG.Dictionary, ["o", "options"], true, "The rpc query options"]],
    example:
      "-o {route: '/jsonrpc', method: 'server_version', params: {service: 'db'}}",
  });
  TerminalObj.registerCommand("metadata", {
    definition: "View record metadata",
    callback: cmdMetadata,
    detail: "View record metadata",
    args: [
      [ARG.String, ["m", "model"], true, "The record model"],
      [ARG.Number, ["i", "id"], true, "The record id"],
    ],
    example: "-m res.partner -i 1",
  });
  TerminalObj.registerCommand("barcode", {
    definition: "Operations over barcode",
    callback: cmdBarcode,
    detail: "See information and send barcode strings",
    args: [
      [
        ARG.String,
        ["o", "operation"],
        false,
        "The operation",
        "send",
        ["send", "info"],
      ],
      [
        ARG.List | ARG.Number | ARG.String,
        ["d", "data"],
        false,
        "The data to send",
      ],
      [
        ARG.Number,
        ["pd", "pressdelay"],
        false,
        "The delay between presskey events (in ms)",
        3,
      ],
      [
        ARG.Number,
        ["bd", "barcodedelay"],
        false,
        "The delay between barcodes reads (in ms)",
        150,
      ],
    ],
    example: "-o send -d O-CMD.NEXT",
  });
  TerminalObj.registerCommand("ws", {
    definition: "Open a web socket",
    callback: cmdWebSocket,
    detail: "Open a web socket",
    args: [
      [
        ARG.String,
        ["o", "operation"],
        true,
        "The operation",
        "open",
        ["open", "close", "send", "health"],
      ],
      [ARG.String, ["e", "endpoint"], false, "The endpoint"],
      [ARG.Any, ["wo", "websocket"], false, "The websocket object"],
      [ARG.Any, ["d", "data"], false, "The data"],
      [ARG.Flag, ["no-tls", "no-tls"], false, "Don't use TLS"],
    ],
    example: "-o open -e /websocket",
  });
  TerminalObj.registerCommand("commit", {
    definition: "Commit recordset changes",
    callback: cmdCommit,
    detail: "Write recordset changes",
    args: [[ARG.Any, ["r", "recordset"], true, "The Recordset"]],
    example: "-r $recordset",
  });
  TerminalObj.registerCommand("rollback", {
    definition: "Revert recordset changes",
    callback: cmdRollback,
    detail: "Undo recordset changes",
    args: [[ARG.Any, ["r", "recordset"], true, "The Recordset"]],
    example: "-r $recordset",
  });
  TerminalObj.registerCommand("now", {
    definition: "Current time",
    callback: cmdNow,
    detail: "Prints the current time",
    args: [
      [
        ARG.String,
        ["t", "type"],
        false,
        "Date type",
        "full",
        ["full", "date", "time"],
      ],
      [ARG.Flag, ["tz", "tz"], false, "Use timezone", false],
    ],
    example: "-t time --tz",
  });
}
