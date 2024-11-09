// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

function sanitizeValue(value: string): string {
  let res = value;
  if (/[",\n]/.test(res)) {
    res = res.replace(/"/g, '""');
    res = `"${res}"`;
  }
  return res;
}

// More Info: https://datatracker.ietf.org/doc/html/rfc4180
export function stringify(items: $ReadOnlyArray<{...}>, use_header: boolean = false): string {
  let res = '';
  if (use_header) {
    const headers = Object.keys(items[0]).map((value) => sanitizeValue(new String(value).toString()));
    if (headers.length > 0) {
      res += `${headers.join(',')}\n`;
    }
  }
  for (const item of items) {
    const san_values = Object.values(item).map((value) => sanitizeValue(new String(value).toString()));
    res += `${san_values.join(',')}\n`;
  }
  return res;
}
