// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import encodeHTML from './encode_html';

export default function (obj) {
  return encodeHTML(JSON.stringify(obj, null, 4));
}
