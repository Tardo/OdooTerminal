// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {CMDAssistantOption} from '@terminal/core/command_assistant';

export default function (option: CMDAssistantOption, index: number, selected_option_index: number): string {
  const strval = option.string ?? 'Unknown';
  let strname = option.name ?? 'Unknown';
  if (option.is_default) {
    strname = `<strong>${strname}</strong>`;
  }
  return `<li class="nav-item"><a class="nav-link p-1 px-2 ${
    option.is_default ? 'text-warning' : ''
  } ${option.is_required ? 'text-warning' : ''} ${
    index === selected_option_index ? 'bg-dark active' : ''
  }" data-string="${strval}" style="padding:0.25em" href="#">${strname}</a></li>`;
}
