// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

let _uniqueId = 0;
export default function (prefix: string): string | number {
  const nid = ++_uniqueId;
  if (prefix) {
    return `${prefix}${nid}`;
  }
  return nid;
}
