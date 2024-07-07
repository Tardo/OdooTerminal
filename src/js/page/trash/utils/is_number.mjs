// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (value: mixed): boolean {
  return !(value === null || value === ' ' || isNaN(Number(value)));
}
