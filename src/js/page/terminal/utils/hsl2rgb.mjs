// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {HSL} from './rgb2hsl';
import type {RGB} from './hex2rgb';

export default function (hsl: HSL): RGB {
  const h = hsl[0] % 360;

  const c = (1 - Math.abs(2 * hsl[2] - 1)) * hsl[1];
  const hPrime = h / 60;
  const x = c * (1 - Math.abs(hPrime % 2 - 1));

  let r, g, b;
  if (hPrime >= 0 && hPrime < 1) {
    [r, g, b] = [c, x, 0];
  } else if (hPrime < 2) {
    [r, g, b] = [x, c, 0];
  } else if (hPrime < 3) {
    [r, g, b] = [0, c, x];
  } else if (hPrime < 4) {
    [r, g, b] = [0, x, c];
  } else if (hPrime < 5) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  const m = hsl[2] - c / 2;

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}
