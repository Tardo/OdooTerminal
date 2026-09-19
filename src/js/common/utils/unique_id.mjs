// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

let _uniqueId = 0;
export default function (prefix: string | void): string {
  const nid = ++_uniqueId;
  if (typeof prefix === 'string') {
    return `${prefix}${nid}`;
  }
  return new String(nid).toString();
}
