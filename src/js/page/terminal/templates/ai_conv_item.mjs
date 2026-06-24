// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import encodeHTML from '@terminal/utils/encode_html';

export default function (id: string, name: string, isActive: boolean): string {
  const activeClass = isActive ? ' terminal-ai-conv-item-active' : '';
  const safeName = encodeHTML(name);
  const safeId = encodeHTML(id);
  return (
    `<div class='terminal-ai-conv-item${activeClass}' data-conv-id='${safeId}'>` +
    `<span class='terminal-ai-conv-name' title='${safeName}'>${safeName}</span>` +
    "<div class='terminal-ai-conv-delete' role='button'>" +
    "<i class='fa fa-trash'></i>" +
    '</div>' +
    '</div>'
  );
}
