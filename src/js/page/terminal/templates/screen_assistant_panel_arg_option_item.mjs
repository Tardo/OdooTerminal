// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {CMDAssistantOption} from '@terminal/core/command_assistant';

export default function (option: CMDAssistantOption, index: number, selected_option_index: number): string {
  const strval = option.string ?? 'Unknown';
  const strname = option.name ?? 'Unknown';
  return `<li class="nav-item"><a class="nav-link p-1 px-2 ${
    option.is_default ? 'terminal-text-info' : ''
  } ${option.is_required ? 'terminal-text-success' : ''} ${
    index === selected_option_index ? 'terminal-bg-dark active' : ''
  }" data-string="${strval}" style="padding:0.25em" href="#">${strname}</a></li>`;
}
