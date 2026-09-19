// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import encodeHTML from '@terminal/utils/encode_html';

export default function (label: string, text: string): string {
  return (
    "<div class='terminal-watchdog-history-item'>" +
    `<strong>${encodeHTML(label)}</strong>` +
    `<span>${encodeHTML(text)}</span>` +
    '</div>'
  );
}
