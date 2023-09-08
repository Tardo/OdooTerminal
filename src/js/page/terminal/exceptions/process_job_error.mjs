// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class extends Error {
  constructor(cmd_name, error_data) {
    super(`Error executing '${cmd_name}'`);
    this.name = this.constructor.name;
    this.data = error_data;
  }
}
