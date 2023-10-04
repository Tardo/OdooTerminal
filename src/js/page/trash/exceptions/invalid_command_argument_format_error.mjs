// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class extends Error {
  constructor(message, cmd_name) {
    super(message);
    this.name = 'InvalidCommandArgumentFormatError';
    this.cmd_name = cmd_name;
  }
}
