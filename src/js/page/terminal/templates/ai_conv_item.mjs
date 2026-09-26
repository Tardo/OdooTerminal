// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import encodeHTML from '@terminal/utils/encode_html';
import renderIcon from './icon';

export default function (id: string, name: string, isActive: boolean, isBusy: boolean): string {
  const activeClass = isActive ? ' terminal-ai-conv-item-active' : '';
  const safeName = encodeHTML(name);
  const safeId = encodeHTML(id);
  const busyIcon = isBusy ? renderIcon('fa-cog', 'fa-spin terminal-ai-conv-busy') : '';
  return (
    `<div class='terminal-ai-conv-item${activeClass}' data-conv-id='${safeId}'>` +
    busyIcon +
    `<span class='terminal-ai-conv-name' title='${safeName}'>${safeName}</span>` +
    "<div class='terminal-ai-conv-delete' role='button'>" +
    renderIcon('fa-trash') +
    '</div>' +
    '</div>'
  );
}
