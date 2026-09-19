// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

let _uniqueId = 0;
export default function (prefix: string | void): string {
  const nid = ++_uniqueId;
  if (typeof prefix === 'string') {
    return `${prefix}${nid}`;
  }
  return new String(nid).toString();
}
