// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (obj, skey) {
  return Object.keys(obj).map(key => obj[key][skey]);
}
