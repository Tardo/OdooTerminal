// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function (items: $ReadOnlyArray<mixed>): Array<mixed> {
  return Array.from(new Set(items));
}
