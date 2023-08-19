// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// See https://stackoverflow.com/a/7616484
export default function (text) {
  let hash = 0;
  const len = text.length;
  for (let i = 0; i < len; ++i) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    // Convert to 32bit integer
    hash |= 0;
  }
  return hash;
}
