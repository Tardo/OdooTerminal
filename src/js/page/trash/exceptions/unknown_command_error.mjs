// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class extends Error {
  constructor(cmd_name, start, end) {
    super(`Unknown Command '${cmd_name}' at ${start}:${end}`);
    this.name = this.constructor.name;
    this.cmd_name = cmd_name;
    this.start = start;
    this.end = end;
  }
}
