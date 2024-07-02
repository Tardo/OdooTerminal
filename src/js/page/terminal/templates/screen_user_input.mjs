// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import encodeHTML from '@terminal/utils/encode_html';

export default function (PROMPT: string): string {
  return `<div class='terminal-user-input'>
    <div class='terminal-prompt-container'>
      <span id="terminal-prompt-main" class='terminal-prompt'></span>
      <span>${encodeHTML(PROMPT)}</span>
    </div>
    <div class='terminal-prompt-container terminal-prompt-interactive d-none hidden'></div>
    <div class='rich-input'>
      <input type='edit' id='terminal_shadow_input' autocomplete='off-term-shadow' spellcheck="false" autocapitalize="off" readonly='readonly'/>
      <input type='edit' id='terminal_input' autocomplete='off' spellcheck="false" autocapitalize="off" />
      <textarea id='terminal_input_multi' autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" rows="8"></textarea>
    </div>
    <div class="terminal-prompt-container terminal-prompt-info">
      <span id="terminal-prompt-info-version" class='terminal-prompt-info'></span>
    </div>
    <div class="terminal-prompt-container terminal-prompt-host-container">
      <span id="terminal-prompt-info-host" class='terminal-prompt'></span>
    </div>
    <div id="terminal_input_multi_info">
      <span>Press 'CTRL + &lt;Intro&gt;' to execute.</span>
    </div>
  </div>`;
}
