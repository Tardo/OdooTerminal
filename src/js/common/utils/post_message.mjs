// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export type InternalMessageData = {
  type: string,
  rid: number,
  ...
};

export default function (type: string, data: {[string]: mixed}, target_origin?: string): number {
  const rid: number = new Date().getTime(); // FIXME: Not the best way to generate id's
  const san_target_origin: string = target_origin !== undefined ? target_origin : document.location.href;
  const msg: InternalMessageData = {
    type: type,
    rid: rid,
  };
  Object.assign(msg, data);
  window.postMessage(msg, san_target_origin);
  return rid;
}
