// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooVersion from "./get_odoo_version";

export default function () {
  return Number(getOdooVersion().split(".", 1)[0]);
}
