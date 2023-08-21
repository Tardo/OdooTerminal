// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class extends Error {
  constructor(cmd_name, args) {
    super('Invalid command arguments');
    this.name = this.constructor.name;
    this.cmd_name = cmd_name;
    this.args = args;
  }
}
