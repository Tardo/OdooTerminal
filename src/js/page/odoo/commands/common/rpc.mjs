// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import rpc from "@odoo/rpc";

function cmdRpc(kwargs) {
  return rpc.query(kwargs.options).then((result) => {
    this.screen.eprint(result);
    return result;
  });
}

export default {
  definition: "Execute raw rpc",
  callback: cmdRpc,
  detail: "Execute raw rpc",
  args: [[ARG.Dictionary, ["o", "options"], true, "The rpc query options"]],
  example:
    "-o {route: '/jsonrpc', method: 'server_version', params: {service: 'db'}}",
};
