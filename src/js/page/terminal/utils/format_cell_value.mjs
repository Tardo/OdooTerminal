// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import encodeHTML from './encode_html';
import prettyObjectString from './pretty_object_string';

// Flat arrays (many2one [id, name], many2many [id, id, ...]) stay as a compact
// comma-joined string; nested arrays/objects (e.g. a selection field's [value, label]
// pairs) get a real literal representation instead of being flattened by String().
export default function (value: mixed): string {
  if (
    value !== null &&
    typeof value === 'object' &&
    (!(value instanceof Array) || value.some((sub: mixed) => sub !== null && typeof sub === 'object'))
  ) {
    return prettyObjectString(value, value instanceof Array ? 0 : 4);
  }
  return encodeHTML(String(value));
}
