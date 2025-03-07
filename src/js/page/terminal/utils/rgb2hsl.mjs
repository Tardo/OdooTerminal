// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {RGB} from './hex2rgb';
export type HSL = [number, number, number];

export default function (rgb: RGB): HSL {
  // Normalizar a rango 0-1
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h, s;

  // Lightness
  const l = (max + min) / 2;

  // Saturation y Hue
  if (delta === 0) {
      h = 0; // Undefined, pero usamos 0
      s = 0;
  } else {
    // Saturation
    s = delta / (1 - Math.abs(2 * l - 1));

    // Hue
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / delta + 2) * 60;
        break;
      case b:
        h = ((r - g) / delta + 4) * 60;
        break;
    }
  }

  return [
    Math.round(h),
    Number(s.toFixed(3)),
    Number(l.toFixed(3))
  ];
}
