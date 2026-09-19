// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function (): number {
  return Number(owl.__info__.version.split('.')[0]);
}
