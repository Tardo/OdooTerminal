// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export type InternalMessageData = {
  type: string,
  rid: number,
  ...
};

export default function (type: string, data: {[string]: mixed}, target_origin?: string): number {
  const rid: number = Number(Math.random().toString(10).slice(2))
  const san_target_origin: string = target_origin !== undefined ? target_origin : document.location.href;
  // $FlowFixMe[cannot-spread-indexer]
  const msg: InternalMessageData = {
    type: type,
    rid: rid,
    ...data,
  };
  window.postMessage(msg, san_target_origin);
  return rid;
}
