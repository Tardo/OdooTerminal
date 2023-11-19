// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (data) {
  return (
    !data ||
    (data.constructor === Object && Object.keys(data).length === 0) ||
    (data.constructor === Array && data.length === 0)
  );
}
