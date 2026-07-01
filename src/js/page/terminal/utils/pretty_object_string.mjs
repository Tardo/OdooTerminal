// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import encodeHTML from './encode_html';
import replacer from './stringify_replacer';

export default function (obj: mixed, indent: number = 4): string {
  return encodeHTML(JSON.stringify(obj, replacer, indent) ?? '');
}
