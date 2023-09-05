// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (type, data, target_origin) {
  const rid = new Date().getTime(); // FIXME: Not the best way to generate id's
  const san_target_origin = target_origin
    ? target_origin
    : document.location.href;
  window.postMessage(
    Object.assign({}, data, {type: type, rid: rid}),
    san_target_origin,
  );
  return rid;
}
