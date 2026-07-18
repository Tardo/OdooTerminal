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
    ctx.screen.print(i18n.t('cmdAI.error.noSubcommand', 'Usage: ai connect|chat|agent|stop ...'));
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
      await cmdAIAgent.call(this, {prompt, model: kwargs.model, timeout: kwargs.timeout, max_steps: kwargs.max_steps}, ctx);
      break;
    }
    case 'stop': {
      cmdAIStop(ctx);
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
          i18n.t('cmdAI.error.usage', 'Usage: ai connect|chat|agent|attach|stop ...'),
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
      'Connect to an AI server (OpenAI-compatible, Anthropic, Gemini or Cohere API) and chat with it, translate natural language into terminal commands, or run an autonomous agent that executes commands iteratively. The openai provider is OpenAI-compatible, so it also covers Groq, Mistral, DeepSeek, Ollama, OpenRouter, xAI and similar servers via a custom URL.',
    ),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        true,
        i18n.t('cmdAI.args.operation', 'operation: connect, chat, agent, attach or stop'),
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
