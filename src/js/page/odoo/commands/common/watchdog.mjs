// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdWatchdog(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (typeof kwargs.model === 'string' && kwargs.model.length > 0) {
    this.setWatchdogModel(kwargs.model);
  }
  if (typeof kwargs.reasoning === 'string' && kwargs.reasoning.length > 0) {
    this.setWatchdogReasoning(kwargs.reasoning);
  }
  if (typeof kwargs.profile === 'string' && kwargs.profile.length > 0) {
    this.setWatchdogProfile(kwargs.profile);
  }
  const state: ?string = kwargs.state;
  if (state === 'on') {
    this.toggleWatchdogMode(true);
  } else if (state === 'off') {
    this.toggleWatchdogMode(false);
  }
  const enabled = this.isWatchdogModeEnabled();
  const reasoning = this.getWatchdogReasoning();
  const profile = this.getWatchdogProfile();
  const watchdogModel = this.getWatchdogModel();
  const modelLabel = watchdogModel.length > 0 ? watchdogModel : i18n.t('cmdWatchdog.model.notSet', '(not set)');
  ctx.screen.print(
    enabled
      ? i18n.t(
          'cmdWatchdog.status.on',
          'Watchdog mode: on for this instance (saved locally — survives closing the browser, no need to redo this or reconnect next time). Model: {{model}}. Profile: {{profile}}. Reasoning: {{reasoning}}.',
          {model: modelLabel, profile, reasoning: reasoning.length > 0 ? reasoning : i18n.t('cmdWatchdog.reasoning.default', 'default')},
        )
      : i18n.t('cmdWatchdog.status.off', 'Watchdog mode: off (model for when enabled: {{model}})', {model: modelLabel}),
  );
  if (enabled && reasoning.length === 0) {
    ctx.screen.print(
      i18n.t(
        'cmdWatchdog.reasoning.hint',
        'Tip: if the watchdog sometimes shows nothing, your model may be spending its whole reply on internal reasoning before answering. Try "watchdog -r off" (or a non-thinking model for this slot).',
      ),
      false,
    );
  }
  if (enabled) {
    ctx.screen.print(
      i18n.t(
        'cmdWatchdog.tokenWarning',
        '⚠ High token usage: the watchdog calls the AI automatically on EVERY save, field edit, record you open, lingering hover over a button, and Odoo warning/error message — with no manual step in between. Only use this with a local model (Ollama, llama.cpp, etc.) — it is NOT recommended with a paid cloud provider, where it can run up a large bill unattended.',
      ),
      false,
      'line-warning',
    );
  }
  if (enabled && !this.hasWatchdogConnection()) {
    ctx.screen.print(
      i18n.t(
        'cmdWatchdog.noProvider',
        'No dedicated provider is configured for the watchdog yet, so it has nothing to call. The watchdog never borrows the AI sidebar\'s active connection — open the extension\'s Options page → AI Watchdog and pick a provider + model there (add one under "AI Providers" first if you haven\'t). That choice is remembered per instance too, so this is a one-time step.',
      ),
    );
  }
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdWatchdog.definition', 'Opt-in floating AI watchdog that reacts to page activity on its own'),
    callback: cmdWatchdog,
    detail: i18n.t(
      'cmdWatchdog.detail',
      'An opt-in floating AI watchdog that reacts on its own: every time it detects a save, a deletion, an opened record, a field edit (form or list line), a lingering hover over a button or field, a warning/error message from Odoo, or an exception (an RPC error from a save/delete, or an uncaught JS error on the page — explained with a root-cause read, technical profile only, see "-pf" below), it automatically sends a one-shot, read-only consult (no run_command, cannot change anything) to the AI and peeks from the right edge with a short verdict. Since this fires constantly and can burn tokens fast, use a local model for it: "watchdog -p on -m <local-model>". "-m" alone (without "-p") just changes the model without touching on/off. "-pf <profile>" picks who it writes for: technical (default, also the only profile that explains exceptions), accounting or sales. Clicking the watchdog never calls the AI and never registers its notes into the terminal/agent conversation — it just expands the bubble in place to show the watchdog\'s own message history; click again to collapse. If a "thinking" model shows nothing, set "-r off" so it skips chain-of-thought instead of spending its reply budget on it. Needs its own connection: configure a provider + model under the extension\'s Options page → AI Watchdog (independent from the "ai" command\'s connection).',
    ),
    args: [
      [
        ARG.String,
        ['p', 'state'],
        false,
        i18n.t('cmdWatchdog.args.state', 'Turn the watchdog on or off for this instance'),
        null,
        ['on', 'off'],
      ],
      [
        ARG.String,
        ['m', 'model'],
        false,
        i18n.t('cmdWatchdog.args.model', 'Model name to use for the watchdog'),
      ],
      [
        ARG.String,
        ['r', 'reasoning'],
        false,
        i18n.t(
          'cmdWatchdog.args.reasoning',
          "Reasoning effort for \"thinking\" models: off, low, medium or high. 'off' asks local OpenAI-compatible " +
            "servers (llama.cpp, vLLM, ...) to skip chain-of-thought — use it if a model shows no output because it " +
            'spends its whole reply thinking. openai provider only for now.',
        ),
        null,
        ['off', 'low', 'medium', 'high'],
      ],
      [
        ARG.String,
        ['pf', 'profile'],
        false,
        i18n.t(
          'cmdWatchdog.args.profile',
          'Watchdog persona: technical (default), accounting or sales — changes the vocabulary/focus of its verdicts. Only the technical profile explains exceptions (RPC/JS errors); the other profiles don\'t react to them (Odoo\'s own on-screen error message is unaffected either way).',
        ),
        null,
        ['technical', 'accounting', 'sales'],
      ],
    ],
    example: '-p on -m "llama3.2"',
  };
}
