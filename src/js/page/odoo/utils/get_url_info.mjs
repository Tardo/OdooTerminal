// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (section: string, key: string): string | void {
  const data = Object.fromEntries(
    window.location[section]
      .substr(1)
      .split('&')
      .map(item => item.split('=')),
  );
  return data[key];
}
