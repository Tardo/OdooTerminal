// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export type RGB = [number, number, number];

export default function (hex: number): RGB {
  const r = (hex >> 24) & 0xff;
  const g = (hex >> 16) & 0xff;
  const b = (hex >> 8) & 0xff;
  return [r, g, b];
}
