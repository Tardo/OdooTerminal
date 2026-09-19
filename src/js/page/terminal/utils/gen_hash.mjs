// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

// See https://stackoverflow.com/a/7616484
export default function (text: string): number {
  let hash = 0;
  const len = text.length;
  for (let i = 0; i < len; ++i) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    // Convert to 32bit integer
    hash |= 0;
  }
  return hash;
}
