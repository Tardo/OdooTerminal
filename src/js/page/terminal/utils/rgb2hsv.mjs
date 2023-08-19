// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (r, g, b) {
  const h_min = Math.min(Math.min(r, g), b);
  const h_max = Math.max(Math.max(r, g), b);

  // Hue
  let hue = 0.0;

  if (h_max === h_min) {
    hue = 0.0;
  } else if (h_max === r) {
    hue = (g - b) / (h_max - h_min);
  } else if (h_max === g) {
    hue = 2.0 + (b - r) / (h_max - h_min);
  } else {
    hue = 4.0 + (r - g) / (h_max - h_min);
  }

  hue /= 6.0;

  if (hue < 0.0) {
    hue += 1.0;
  }

  // Saturation
  let s = 0.0;
  if (h_max !== 0.0) {
    s = (h_max - h_min) / h_max;
  }

  // Value
  const v = h_max;

  return [hue, s, v];
}
