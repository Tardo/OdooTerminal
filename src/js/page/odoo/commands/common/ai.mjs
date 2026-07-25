// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import cmdAIConnect from '@ai/operations/connect';
import cmdAIChat from '@ai/operations/chat';
import cmdAIAgent from '@ai/operations/agent';
import cmdAIStop from '@ai/operations/stop';
import searchRead from '@odoo/orm/search_read';
import {DEFAULT_MAX_STEPS, DEFAULT_MAX_TOKENS} from '@ai/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';


async function cmdAI(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const operation: ?string = kwargs.operation;

  if (operation === null || operation === undefined) {
    ctx.screen.print(i18n.t('cmdAI.error.noSubcommand', 'Usage: ai connect|chat|agent|watchdog|attach|stop ...'));
    return;
  }

  switch (operation) {
    case 'connect': {
      const url: ?string = kwargs.url;
      if (url === null || url === undefined) {
        throw new Error(i18n.t('cmdAI.connect.error.noUrl', 'No URL provided. Use: ai connect -u <url>'));
      }
      await cmdAIConnect(
        {
          url,
          api_key: kwargs.api_key,
          model: kwargs.model,
          timeout: kwargs.timeout,
          provider: kwargs.provider,
          max_tokens: kwargs.max_tokens,
        },
        ctx,
      );
      break;
    }
    case 'chat': {
      const prompt: ?string = kwargs.prompt;
      if (prompt === null || prompt === undefined || prompt === '') {
        throw new Error(i18n.t('cmdAI.chat.error.noPrompt', 'No prompt provided. Use: ai chat -p "your prompt"'));
      }
      await cmdAIChat(
        {
          prompt,
          model: kwargs.model,
          timeout: kwargs.timeout,
        },
        ctx,
      );
      break;
    }
    case 'agent': {
      const prompt: ?string = kwargs.prompt;
      if (prompt === null || prompt === undefined || prompt === '') {
        throw new Error(i18n.t('cmdAI.agent.error.noPrompt', 'No prompt provided. Use: ai agent -p "your request"'));
      }
      await cmdAIAgent.call(
        this,
        {prompt, model: kwargs.model, timeout: kwargs.timeout, max_steps: kwargs.max_steps, reasoning: kwargs.reasoning},
        ctx,
      );
      break;
    }
    case 'stop': {
      cmdAIStop(ctx);
      break;
    }
    case 'watchdog': {
      if (typeof kwargs.model === 'string' && kwargs.model.length > 0) {
        this.setWatchdogModel(kwargs.model);
      }
      if (typeof kwargs.reasoning === 'string' && kwargs.reasoning.length > 0) {
        this.setWatchdogReasoning(kwargs.reasoning);
      }
      if (typeof kwargs.profile === 'string' && kwargs.profile.length > 0) {
        this.setWatchdogProfile(kwargs.profile);
      }
      const state: ?string = kwargs.prompt;
      if (state === 'on') {
        this.toggleWatchdogMode(true);
      } else if (state === 'off') {
        this.toggleWatchdogMode(false);
      }
      const enabled = this.isWatchdogModeEnabled();
      const reasoning = this.getWatchdogReasoning();
      const profile = this.getWatchdogProfile();
      const watchdogModel = this.getWatchdogModel();
      const modelLabel = watchdogModel.length > 0 ? watchdogModel : i18n.t('cmdAI.watchdog.model.notSet', '(not set)');
      ctx.screen.print(
        enabled
          ? i18n.t(
              'cmdAI.watchdog.status.on',
              'Watchdog mode: on for this instance (saved locally — survives closing the browser, no need to redo this or reconnect next time). Model: {{model}}. Profile: {{profile}}. Reasoning: {{reasoning}}.',
              {model: modelLabel, profile, reasoning: reasoning.length > 0 ? reasoning : i18n.t('cmdAI.watchdog.reasoning.default', 'default')},
            )
          : i18n.t('cmdAI.watchdog.status.off', 'Watchdog mode: off (model for when enabled: {{model}})', {model: modelLabel}),
      );
      if (enabled && reasoning.length === 0) {
        ctx.screen.print(
          i18n.t(
            'cmdAI.watchdog.reasoning.hint',
            'Tip: if the watchdog sometimes shows nothing, your model may be spending its whole reply on internal reasoning before answering. Try "ai watchdog -r off" (or a non-thinking model for this slot).',
          ),
          false,
        );
      }
      if (enabled) {
        ctx.screen.print(
          i18n.t(
            'cmdAI.watchdog.tokenWarning',
            '⚠ High token usage: the watchdog calls the AI automatically on EVERY save, field edit, record you open, lingering hover over a button, and Odoo warning/error message — with no manual step in between. Only use this with a local model (Ollama, llama.cpp, etc.) — it is NOT recommended with a paid cloud provider, where it can run up a large bill unattended.',
          ),
          false,
          'line-warning',
        );
      }
      if (enabled && !this.hasWatchdogConnection()) {
        ctx.screen.print(
          i18n.t(
            'cmdAI.watchdog.noProvider',
            'No dedicated provider is configured for the watchdog yet, so it has nothing to call. The watchdog never borrows the AI sidebar\'s active connection — open the extension\'s Options page → AI Watchdog and pick a provider + model there (add one under "AI Providers" first if you haven\'t). That choice is remembered per instance too, so this is a one-time step.',
          ),
        );
      }
      break;
    }
    case 'attach': {
      const attachId: ?number = kwargs.id;
      if (attachId === null || attachId === undefined) {
        throw new Error(i18n.t('cmdAI.attach.error.noId', 'No attachment id provided. Use: ai attach -i <id>'));
      }
      const context = await this.getContext();
      const records = await searchRead(
        'ir.attachment',
        [['id', '=', attachId]],
        ['name', 'mimetype', 'datas'],
        context,
      );
      if (!records || records.length === 0) {
        throw new Error(i18n.t('cmdAI.attach.error.notFound', 'Attachment {{id}} not found', {id: attachId}));
      }
      const rec = records[0];
      const name: string = String(rec.name || `attachment_${attachId}`);
      const media_type: string = String(rec.mimetype || 'application/octet-stream');
      const data: string = String(rec.datas || '');
      if (!data) {
        throw new Error(i18n.t('cmdAI.attach.error.noData', 'Attachment {{id}} has no binary data', {id: attachId}));
      }
      this.addPendingAttachment({name, media_type, data});
      break;
    }
    default: {
      ctx.screen.print(
        i18n.t('cmdAI.error.unknownOperation', 'Unknown operation: {{sub}}', {sub: operation}) +
          '\n' +
          i18n.t('cmdAI.error.usage', 'Usage: ai connect|chat|agent|watchdog|attach|stop ...'),
      );
    }
  }
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdAI.definition', 'AI assistant (connect, chat & agent)'),
    callback: cmdAI,
    detail: i18n.t(
      'cmdAI.detail',
      'Connect to an AI server (OpenAI-compatible, Anthropic, Gemini or Cohere API) and chat with it, translate natural language into terminal commands, or run an autonomous agent that executes commands iteratively. The openai provider is OpenAI-compatible, so it also covers Groq, Mistral, DeepSeek, Ollama, OpenRouter, xAI and similar servers via a custom URL.\n' +
      '"watchdog" is an opt-in floating AI watchdog that reacts on its own: every time it detects a save, a deletion, an opened record, a field edit (form or list line), a lingering hover over a button or field, a warning/error message from Odoo, or an exception (an RPC error from a save/delete, or an uncaught JS error on the page — explained with a root-cause read, technical profile only, see "-pf" below), it automatically sends a one-shot, read-only consult (no run_command, cannot change anything) to the AI and peeks from the right edge with a short verdict. Since this fires constantly and can burn tokens fast, use a local model for it: "ai watchdog -p on -m <local-model>". "-m" alone (without -p) just changes the model without touching on/off. "-pf <profile>" picks who it writes for: technical (default, also the only profile that explains exceptions), accounting or sales. Clicking the watchdog never calls the AI and never registers its notes into the terminal/agent conversation — it just expands the bubble in place to show the watchdog\'s own message history; click again to collapse. If a "thinking" model shows nothing, set "-r off" (agent or watchdog) so it skips chain-of-thought instead of spending its reply budget on it.',
    ),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        true,
        i18n.t('cmdAI.args.operation', 'operation: connect, chat, agent, watchdog, attach or stop'),
      ],
      // connect options
      [
        ARG.String,
        ['u', 'url'],
        false,
        i18n.t('cmdAI.args.url', 'AI server URL (e.g. http://localhost:8080/v1)'),
      ],
      [
        ARG.String,
        ['ak', 'api-key'],
        false,
        i18n.t('cmdAI.args.apiKey', 'API key for authentication'),
      ],
      [
        ARG.String,
        ['m', 'model'],
        false,
        i18n.t('cmdAI.args.model', 'Model name to use'),
      ],
      [
        ARG.String,
        ['pr', 'provider'],
        false,
        i18n.t('cmdAI.args.provider', 'AI provider: openai (OpenAI-compatible, default), anthropic, gemini or cohere'),
        null,
        ['openai', 'anthropic', 'gemini', 'cohere'],
      ],
      // chat / agent options
      [
        ARG.String,
        ['p', 'prompt'],
        false,
        i18n.t('cmdAI.args.prompt', 'The prompt or natural language request to send'),
      ],
      [
        ARG.Number,
        ['t', 'timeout'],
        false,
        i18n.t('cmdAI.args.timeout', 'Max seconds to wait for a response (0 = no limit)'),
        900,
      ],
      // agent / watchdog options
      [
        ARG.String,
        ['r', 'reasoning'],
        false,
        i18n.t(
          'cmdAI.args.reasoning',
          "Reasoning effort for \"thinking\" models (agent and watchdog): off, low, medium or high. 'off' asks local " +
            "OpenAI-compatible servers (llama.cpp, vLLM, ...) to skip chain-of-thought — use it if a model shows no " +
            'output because it spends its whole reply thinking. openai provider only for now.',
        ),
        null,
        ['off', 'low', 'medium', 'high'],
      ],
      // watchdog options
      [
        ARG.String,
        ['pf', 'profile'],
        false,
        i18n.t(
          'cmdAI.args.profile',
          'Watchdog persona: technical (default), accounting or sales — changes the vocabulary/focus of its verdicts. Only the technical profile explains exceptions (RPC/JS errors); the other profiles don\'t react to them (Odoo\'s own on-screen error message is unaffected either way).',
        ),
        null,
        ['technical', 'accounting', 'sales'],
      ],
      // agent options
      [
        ARG.Number,
        ['n', 'max-steps'],
        false,
        i18n.t('cmdAI.args.maxSteps', `Max agent iterations (agent only, default {{DEFAULT_MAX_STEPS}})`, {DEFAULT_MAX_STEPS}),
        DEFAULT_MAX_STEPS,
      ],
      // safety options
      [
        ARG.Number,
        ['mt', 'max-tokens'],
        false,
        i18n.t('cmdAI.args.maxTokens', 'Max output tokens per request as a cost safety limit (default {{DEFAULT_MAX_TOKENS}})', {DEFAULT_MAX_TOKENS}),
        DEFAULT_MAX_TOKENS,
      ],
      // attach options
      [
        ARG.Number,
        ['i', 'id'],
        false,
        i18n.t('cmdAI.args.attachId', 'ir.attachment ID to queue as AI input attachment (attach operation)'),
      ],
    ],
    example: 'connect -u "https://api.anthropic.com" -pr anthropic -ak "sk-ant-..." -m "claude-opus-4-8"',
  };
}
