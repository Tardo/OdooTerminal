// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

const regexVersion = /[a-z]+(?:\d+)?|[~+]|-\d+/g;
export default function (ver: string): string | null {
  return ver?.replace(regexVersion, '') || null;
}
