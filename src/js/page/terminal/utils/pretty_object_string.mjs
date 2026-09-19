// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import encodeHTML from './encode_html';
import replacer from './stringify_replacer';

export default function (obj: mixed, indent: number = 4): string {
  return encodeHTML(JSON.stringify(obj, replacer, indent) ?? '');
}
