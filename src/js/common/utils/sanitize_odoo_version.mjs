// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const regexVersion = /[a-z]+~|-\d+/g;
export default function (ver: string): string {
  return ver?.replace(regexVersion, '');
}
