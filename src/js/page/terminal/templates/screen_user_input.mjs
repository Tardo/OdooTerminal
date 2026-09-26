// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import encodeHTML from '@terminal/utils/encode_html';
import i18n from 'i18next';
import renderIcon from './icon';

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
    <div class='terminal-ai-attach-zone'>
      <button id='terminal_ai_attach_btn' class='terminal-ai-attach-btn' type='button' title='${i18n.t('terminal.tooltip.attachFile', 'Attach file')}'>
        ${renderIcon('fa-paperclip')}
      </button>
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
