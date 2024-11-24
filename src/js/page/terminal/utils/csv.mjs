// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type Recordset from '@terminal/core/recordset';


function sanitizeValue(value: string, regex: RegExp): string {
  let res = value;
  if (regex.test(res)) {
    res = res.replace(/"/g, '""');
    res = `"${res}"`;
  }
  return res;
}

// More Info: https://datatracker.ietf.org/doc/html/rfc4180
export default function(items: Recordset, use_header: boolean = false, delimiter: string = ','): string {
  const san_regex = new RegExp(`["\n${delimiter}]`);
  let res = '';
  if (use_header) {
    // $FlowFixMe
    const headers = Object.keys(items[0]).map((value) => sanitizeValue(new String(value).toString(), san_regex));
    if (headers.length > 0) {
      res += `${headers.join(delimiter)}\n`;
    }
  }
  // $FlowFixMe
  for (const item of items) {
    const san_values = Object.values(item).map((value) => sanitizeValue(new String(value).toString(), san_regex));
    res += `${san_values.join(delimiter)}\n`;
  }
  return res;
}
