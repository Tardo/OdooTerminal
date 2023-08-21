// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (list_a, list_b) {
  return list_a.filter(x => !list_b.includes(x));
}
