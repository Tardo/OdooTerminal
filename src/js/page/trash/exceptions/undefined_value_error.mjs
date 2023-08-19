// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class extends Error {
  constructor(vname) {
    super(`Cannot read properties of undefined (reading '${vname}')`);
    this.name = this.constructor.name;
    this.vname = vname;
  }
}
