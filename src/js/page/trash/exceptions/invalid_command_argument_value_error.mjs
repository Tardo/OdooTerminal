// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class extends Error {
  constructor(cmd_name, arg_value) {
    super(`Unexpected '${arg_value}' value!`);
    this.name = this.constructor.name;
    this.cmd_name = cmd_name;
    this.arg_value = arg_value;
  }
}
