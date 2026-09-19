// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function (ms: number): Promise<> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
