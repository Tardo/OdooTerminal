// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import genHash from "./gen_hash";
import hex2rgb from "./hex2rgb";

export default function (str) {
  const [r, g, b] = hex2rgb(genHash(str));
  const gv = 1 - (0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255));
  return {
    rgb: [r, g, b],
    gv: gv,
  };
}
