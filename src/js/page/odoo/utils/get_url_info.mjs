// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function (section: string, key: string): string | void {
  const data = Object.fromEntries(
    window.location[section]
      .substr(1)
      .split('&')
      .map(item => item.split('=')),
  );
  return data[key];
}
