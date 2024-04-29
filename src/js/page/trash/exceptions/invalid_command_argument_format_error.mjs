// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class extends Error {
  cmd_name: string;

  constructor(message: string, cmd_name: string) {
    super(`${cmd_name}. ${message}`);
    this.name = 'InvalidCommandArgumentFormatError';
    this.cmd_name = cmd_name;
  }
}
