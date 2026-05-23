// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (list: Array<{...}>, skey: string): Array<mixed> {
  // $FlowFixMe[invalid-computed-prop]
  return list.map(item => item[skey]);
}
