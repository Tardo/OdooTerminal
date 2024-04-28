// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {RGB} from './hex2rgb';

export default function (x: number, y: number, z: number): RGB {
  const h = Number(Number(x * 6.0).toFixed());
  const f = x * 6.0 - h;
  const p = z * (1.0 - y);
  const q = z * (1.0 - y * f);
  const t = z * (1.0 - y * (1.0 - f));

  let rgb = [0.0, 0.0, 0.0];
  const _h = h % 6;
  if (_h === 0) {
    rgb = [z, t, p];
  } else if (_h === 1) {
    rgb = [q, z, p];
  } else if (_h === 2) {
    rgb = [q, z, t];
  } else if (_h === 3) {
    rgb = [p, q, z];
  } else if (_h === 4) {
    rgb = [t, p, z];
  } else if (_h === 5) {
    rgb = [z, p, q];
  }
  return rgb;
}
