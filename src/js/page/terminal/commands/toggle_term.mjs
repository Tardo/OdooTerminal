// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

function cmdToggleTerm() {
  return this.doToggle();
}

export default {
  definition: "Toggle terminal visibility",
  callback: cmdToggleTerm,
  detail: "Toggle terminal visibility",
};
