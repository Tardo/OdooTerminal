// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function (prompt: string, cmd: string): string {
  return `${prompt} ${cmd.split(' ')[0]} *****`;
}
