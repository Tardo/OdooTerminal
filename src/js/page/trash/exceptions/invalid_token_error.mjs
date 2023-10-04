// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class extends Error {
  constructor(vname, start, end) {
    super(`Invalid token '${vname}' at ${start}:${end}`);
    this.name = 'InvalidTokenError';
    this.vname = vname;
    this.start = start;
    this.end = end;
  }
}
