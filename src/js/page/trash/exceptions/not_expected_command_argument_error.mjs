// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class extends Error {
  constructor(arg_name, start, end) {
    super(`Argument '${arg_name}' not expected at ${start}:${end}`);
    this.name = 'NotExpectedCommandArgumentError';
    this.arg_name = arg_name;
    this.start = start;
    this.end = end;
  }
}
