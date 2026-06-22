// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {streamRequest, startRequest, handleAbort} from '@ai/utils/network';
import buildMainAgentPrompt from '@ai/agents/main';
import buildVerifyAgentPrompt from '@ai/agents/verify';
import SKILLS from '@ai/skills/__all__';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';


const DEFAULT_MAX_STEPS = 25;
const DEFAULT_MAX_VERIFICATIONS = 10;

const aiState: AIState = {
  url: null,
  apiKey: null,
  model: null,
  timeout: null,
};

let currentController: ?AbortController = null;

async function cmdAIConnect(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const url: string = kwargs.url;
  const apiKey: ?string = kwargs.api_key;
  const model: ?string = kwargs.model;
  const timeout: ?number = kwargs.timeout;

  aiState.url = url;
  aiState.apiKey = apiKey;
  aiState.model = model;
  aiState.timeout = timeout !== null && timeout !== undefined && timeout > 0 ? timeout : null;

  const info = [
    `URL: ${url}`,
    apiKey !== null && apiKey !== undefined ? `API Key: ${apiKey.slice(0, 8)}...` : 'API Key: (none)',
    model !== null && model !== undefined ? `Model: ${model}` : 'Model: (default)',
    aiState.timeout !== null && aiState.timeout !== undefined ? `Timeout: ${aiState.timeout}s` : 'Timeout: (none)',
  ].join('\n');

  ctx.screen.print(i18n.t('cmdAI.connect.result.connected', 'AI Server connected'));
  ctx.screen.print(info, false);
}

async function cmdAIChat(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (aiState.url === null || aiState.url === undefined) {
    throw new Error(i18n.t('cmdAI.chat.error.notConfigured', 'Not connected. Use "ai connect" first'));
  }
  const url: string = aiState.url;

  const prompt: string = kwargs.prompt;
  const model: string =
    kwargs.model !== null && kwargs.model !== undefined
      ? kwargs.model
      : aiState.model !== null && aiState.model !== undefined
        ? aiState.model
        : 'default';
  const timeoutSecs: ?number =
    kwargs.timeout !== null && kwargs.timeout !== undefined ? kwargs.timeout : aiState.timeout;
  const chatController = startRequest(timeoutSecs);
  currentController = chatController;

  ctx.screen.print(i18n.t('cmdAI.chat.result.sending', 'Sending request...'), false);
  ctx.screen.print('--- AI Response (' + model + ') ---', false);

  try {
    const {usage} = await streamRequest(url, aiState.apiKey, model, [{role: 'user', content: prompt}], chatController.signal, delta => {
      ctx.screen.print(delta, true);
    });
    ctx.screen.print('');
    if (usage !== null && usage !== undefined) {
      ctx.screen.print(
        i18n.t('cmdAI.tokens.usage', 'Tokens: {{prompt}} in / {{completion}} out ({{total}} total)', {
          prompt: usage.prompt_tokens,
          completion: usage.completion_tokens,
          total: usage.total_tokens,
        }),
        false,
        'agent-token-usage',
      );
    }
  } catch (err) {
    if (!handleAbort(err, ctx)) {
      ctx.screen.eprint(i18n.t('cmdAI.chat.error.requestFailed', 'Request failed: ') + err.message);
      throw err;
    }
  } finally {
    currentController = null;
  }
}

async function cmdAIAgent(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (aiState.url === null || aiState.url === undefined) {
    throw new Error(i18n.t('cmdAI.agent.error.notConfigured', 'Not connected. Use "ai connect" first'));
  }
  const url: string = aiState.url;

  const prompt: string = kwargs.prompt;
  const model: string =
    kwargs.model !== null && kwargs.model !== undefined
      ? kwargs.model
      : aiState.model !== null && aiState.model !== undefined
        ? aiState.model
        : 'default';
  const timeoutSecs: ?number =
    kwargs.timeout !== null && kwargs.timeout !== undefined ? kwargs.timeout : aiState.timeout;
  const maxSteps: number =
    kwargs.max_steps !== null && kwargs.max_steps !== undefined ? kwargs.max_steps : DEFAULT_MAX_STEPS;
  const maxVerifications: number =
    kwargs.max_verifications !== null && kwargs.max_verifications !== undefined
      ? kwargs.max_verifications
      : DEFAULT_MAX_VERIFICATIONS;

  const messages: Array<AIMessage> = [
    {
      role: 'system',
      content: [
        {
          type: 'text',
          text: buildMainAgentPrompt(this, String(getOdooVersion() ?? ''), maxSteps),
          cache_control: {type: 'ephemeral'},
        },
      ],
    },
    {role: 'user', content: prompt},
  ];

  let verifyAttempts = 0;
  let cmdCount = 0;
  const loadedSkills: Set<string> = new Set();
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  let totalCacheCreationTokens = 0;
  let totalCacheReadTokens = 0;

  const printTokenUsage = () => {
    if (totalPromptTokens === 0 && totalCompletionTokens === 0) {
      return;
    }
    const effectivePromptTokens = totalPromptTokens - totalCacheReadTokens;
    let usageText = i18n.t('cmdAI.tokens.usage', 'Tokens: {{prompt}} in / {{completion}} out ({{total}} total)', {
      prompt: effectivePromptTokens,
      completion: totalCompletionTokens,
      total: effectivePromptTokens + totalCompletionTokens,
    });
    if (totalCacheCreationTokens > 0) {
      usageText += i18n.t(
        'cmdAI.tokens.cache',
        ' · Cache: {{read}} read / {{created}} created',
        {read: totalCacheReadTokens, created: totalCacheCreationTokens},
      );
    } else if (totalCacheReadTokens > 0) {
      usageText += i18n.t(
        'cmdAI.tokens.cacheReadOnly',
        ' · Cache: {{read}} saved',
        {read: totalCacheReadTokens},
      );
    }
    ctx.screen.print(usageText, false, 'agent-token-usage');
  };

  const stopLink = "<span class='agent-stop o_terminal_click o_terminal_cmd' data-cmd='ai stop'>stop</span>";

  // Thinking display state shared across iterations so we can create the element
  // AFTER command output (not at the top of the next iteration), avoiding a
  // sync/async ordering issue: printLive appends synchronously while print/eprint
  // go through a requestAnimationFrame buffer, so a printLive at the top of the
  // next loop iteration would land before queued command-output/error DOM nodes.
  let thinkLive: {update: (html: string) => void} | null = null;
  let thinkStart: number = 0;
  let thinkTimer: IntervalID | null = null;
  let thinkingBaseMsg: string = '';

  const startThinking = (pasoNum: number) => {
    thinkStart = Date.now();
    thinkingBaseMsg = i18n.t('cmdAI.agent.result.thinking', '[Agent] Thinking... (step {{step}}/{{max}})', {
      step: pasoNum,
      max: maxSteps,
    });
    const live = ctx.screen.printLive('agent-thinking');
    thinkLive = live;
    live.update(`${thinkingBaseMsg} <span class="agent-elapsed">(0.0s)</span> ${stopLink}`);
    const elapsedEl = live.el.querySelector('.agent-elapsed');
    thinkTimer = setInterval(() => {
      const elapsed = ((Date.now() - thinkStart) / 1000).toFixed(1);
      if (elapsedEl !== null && elapsedEl instanceof HTMLElement) {
        elapsedEl.textContent = `(${elapsed}s)`;
      }
    }, 100);
  };

  // Flush the command-line echo (printCommand routes through a rAF buffer) before
  // showing the thinking indicator (printLive appends synchronously), so the prompt
  // line always appears above the thinking indicator in the DOM.
  await new Promise(resolve => requestAnimationFrame(resolve));
  startThinking(1);

  for (let step = 0; step < maxSteps; step++) {
    // thinkLive/thinkTimer are already running (set by startThinking before the loop
    // or at the end of the previous CMD iteration after flushing the DOM buffer)

    currentController = startRequest(timeoutSecs);

    let response = '';
    try {
      const {text, usage} = await streamRequest(
        url,
        aiState.apiKey,
        model,
        messages,
        currentController.signal,
        () => undefined,
      );
      response = text;
      if (usage !== null && usage !== undefined) {
        totalPromptTokens += usage.prompt_tokens;
        totalCompletionTokens += usage.completion_tokens;
        totalCacheCreationTokens += usage.cache_creation_input_tokens ?? 0;
        totalCacheReadTokens += usage.cache_read_input_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0;
      }
    } catch (err) {
      if (!handleAbort(err, ctx)) {
        ctx.screen.eprint(i18n.t('cmdAI.agent.error.requestFailed', 'Request failed: ') + err.message);
        throw err;
      }
      return;
    } finally {
      currentController = null;
      if (thinkTimer !== null) {
        clearInterval(thinkTimer);
        thinkTimer = null;
      }
      const thinkElapsed = ((Date.now() - thinkStart) / 1000).toFixed(1);
      thinkLive?.update(`${thinkingBaseMsg} <span class="agent-elapsed">(${thinkElapsed}s)</span>`);
    }

    response = response
      .trim()
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    // Extract <think>...</think> blocks emitted by reasoning models, display them, then strip
    const thinkMatches = [...response.matchAll(/<think>([\s\S]*?)<\/think>/g)];
    const thinkBlocks: Array<string> = thinkMatches.map(m => m[1].trim());
    response = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    response = response.replace(/<\/?think>/g, '').trim();

    for (const thinkContent of thinkBlocks) {
      const escaped = thinkContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      ctx.screen.print(
        `<details class="agent-think"><summary>Thinking...</summary><pre>${escaped}</pre></details>`,
        false,
      );
    }

    messages.push({role: 'assistant', content: response});

    // Extract REASON: description that precedes a CMD: (works for both strict protocol and embedded text)
    let cmdReason = '';
    const lastCmdPos = response.lastIndexOf('CMD:');
    if (lastCmdPos !== -1) {
      const lastReasonPos = response.lastIndexOf('REASON:');
      if (lastReasonPos !== -1 && lastReasonPos < lastCmdPos) {
        const reasonLineEnd = response.indexOf('\n', lastReasonPos);
        cmdReason = response.slice(lastReasonPos + 7, reasonLineEnd !== -1 ? reasonLineEnd : undefined).trim();
      }
    }

    // Normalize: if model skipped CMD:/DONE:/DONE_SKIP: protocol, infer intent.
    // REASON:+CMD: two-line protocol is valid — extract CMD: line from it.
    // Prefer the LAST occurrence so reasoning text before the decision is ignored.
    if (!response.startsWith('CMD:') && !response.startsWith('DONE:') && !response.startsWith('DONE_SKIP:') && !response.startsWith('SKILL:')) {
      const cmdMatches = [...response.matchAll(/^CMD:\s*(.+)$/gm)];
      const rawCmdLine = cmdMatches.length > 0 ? cmdMatches[cmdMatches.length - 1][1].trim() : undefined;
      // Detect "CMD: SKILL: name" — model confused CMD: with SKILL: prefix
      const skillMatches = [...response.matchAll(/^SKILL:\s*\S+/gm)];
      const skillLine = skillMatches.length > 0 ? skillMatches[skillMatches.length - 1][0] : undefined;
      const doneSkipPos = response.lastIndexOf('DONE_SKIP:');
      const donePos = response.lastIndexOf('DONE:');
      if (rawCmdLine !== undefined && rawCmdLine.startsWith('SKILL:')) {
        response = rawCmdLine;
      } else if (skillLine !== undefined) {
        response = skillLine;
      } else if (rawCmdLine !== undefined) {
        response = 'CMD: ' + rawCmdLine;
      } else if (doneSkipPos !== -1 && doneSkipPos > donePos) {
        response = response.slice(doneSkipPos);
      } else if (donePos !== -1) {
        response = response.slice(donePos);
      } else {
        response = 'DONE: ' + response;
      }
    }

    if (response.startsWith('CMD:')) {
      // Take only the first line — models sometimes emit reasoning after the command.
      // Strip surrounding backticks (inline code markers some models add).
      const cmd = response.slice(4).split('\n')[0].trim().replace(/^`+|`+$/g, '');

      if (cmdReason) {
        ctx.screen.print(
          i18n.t('cmdAI.agent.result.cmdReason', '[Agent] {{reason}}', {reason: cmdReason}),
          false,
        );
      }

      const registeredCmds = this.getShell().getVM().getRegisteredCmds();
      const isUnsafe = cmd.split(';').map(part => part.trim().split(/\s+/)[0]).filter(Boolean)
        .some(name => registeredCmds[name]?.unsafe);

      if (isUnsafe) {
        const question = cmdReason
          ? i18n.t('cmdAI.agent.unsafe.questionWithReason', '[Agent] {{reason}} — Unsafe command: {{cmd}} — Execute?', {reason: cmdReason, cmd})
          : i18n.t('cmdAI.agent.unsafe.question', '[Agent] Unsafe command: {{cmd}} — Execute?', {cmd});
        const answer = await ctx.screen.showQuestion(question, ['y', 'n'], 'n');
        if (answer?.toLowerCase() !== 'y') {
          messages.push({
            role: 'user',
            content: i18n.t('cmdAI.agent.unsafe.rejected', 'Command rejected by user: {{cmd}}', {cmd}),
          });
          await new Promise(resolve => requestAnimationFrame(resolve));
          if (step + 1 < maxSteps) {
            startThinking(step + 2);
          }
          continue;
        }
      }

      cmdCount++;
      ctx.screen.print(
        i18n.t('cmdAI.agent.result.running', '[Agent] Running: <code>{{cmd}}</code>', {cmd}),
        false,
      );

      let outputStr = '';
      let cmdFailed = false;
      try {
        // $FlowFixMe[incompatible-type]
        const result: mixed = await this.execute(cmd, false, true, false, false);
        if (result !== null && result !== undefined) {
          try {
            const serialized = JSON.stringify(result);
            outputStr = serialized !== undefined ? serialized : String(result);
          } catch (_) {
            outputStr = String(result);
          }
        } else {
          outputStr = i18n.t('cmdAI.agent.result.noReturnValue', '(command executed, no return value)');
        }
      } catch (err) {
        cmdFailed = true;
        outputStr = err.message;
      }

      const MAX_CMD_OUTPUT_CHARS = 6000;
      if (outputStr.length > MAX_CMD_OUTPUT_CHARS) {
        outputStr = outputStr.slice(0, MAX_CMD_OUTPUT_CHARS) + `\n[output truncated — ${outputStr.length} chars total, showing first ${MAX_CMD_OUTPUT_CHARS}]`;
      }
      messages.push({
        role: 'user',
        content: cmdFailed ? `Command failed:\n${outputStr}` : `Command output:\n${outputStr}`,
      });

      // print/eprint route through a requestAnimationFrame buffer, while printLive
      // appends synchronously. Awaiting one rAF here ensures any command output or
      // error printed by execute() lands in the DOM before the next "Pensando" element.
      await new Promise(resolve => requestAnimationFrame(resolve));

      if (step + 1 < maxSteps) {
        startThinking(step + 2);
      }
    } else if (response.startsWith('SKILL:')) {
      const skillName = response.slice(6).split('\n')[0].trim();
      const skill = SKILLS.find(s => s.name === skillName);

      if (skill === undefined) {
        messages.push({
          role: 'user',
          content: i18n.t('cmdAI.agent.skill.unknown', 'Skill not found: {{name}}. Available: {{list}}', {
            name: skillName,
            list: SKILLS.map(s => s.name).join(', '),
          }),
        });
      } else if (loadedSkills.has(skillName)) {
        messages.push({
          role: 'user',
          content: i18n.t('cmdAI.agent.skill.alreadyLoaded', 'Skill already loaded: {{name}}', {name: skillName}),
        });
      } else {
        loadedSkills.add(skillName);
        const skillLabel = i18n.t('cmdAI.agent.skill.loading', '[Agent] Loading skill: {{name}}', {name: skillName});
        const skillHtml = Array.from(skillLabel)
          .map((ch, i) => {
            const safe = ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === ' ' ? '&nbsp;' : ch;
            return `<span class="agent-skill-char" style="animation-delay:${i * 38}ms">${safe}</span>`;
          })
          .join('');
        ctx.screen.print(skillHtml, false, 'agent-skill-loading');
        const major = Number(getOdooVersion('major') ?? -1);
        messages.push({
          role: 'user',
          content: `Skill loaded: ${skillName}\n${skill.content(major)}`,
        });
      }

      await new Promise(resolve => requestAnimationFrame(resolve));

      if (step + 1 < maxSteps) {
        startThinking(step + 2);
      }
    } else if (response.startsWith('DONE_SKIP:') && cmdCount > 0) {
      const answer = response.slice(10).trim();
      ctx.screen.eprint(i18n.t('cmdAI.agent.result.header', '--- Agent ---'), false);
      ctx.screen.print(answer, false);
      printTokenUsage();
      return;
    } else if (response.startsWith('DONE:') || response.startsWith('DONE_SKIP:')) {
      // DONE_SKIP: with 0 CMDs falls through to full verification (anti-hallucination floor)
      const answer = (response.startsWith('DONE_SKIP:') ? response.slice(10) : response.slice(5)).trim();

      const verifyStart = Date.now();
      const verifyingBaseMsg = i18n.t('cmdAI.agent.result.verifying', '[Agent] Verifying...');
      const verifyLive = ctx.screen.printLive('agent-verifying');
      verifyLive.update(`${verifyingBaseMsg} <span class="agent-elapsed">(0.0s)</span> ${stopLink}`);
      const verifyElapsedEl = verifyLive.el.querySelector('.agent-elapsed');
      const verifyTimer: IntervalID = setInterval(() => {
        const elapsed = ((Date.now() - verifyStart) / 1000).toFixed(1);
        if (verifyElapsedEl !== null && verifyElapsedEl instanceof HTMLElement) {
          verifyElapsedEl.textContent = `(${elapsed}s)`;
        }
      }, 100);

      const verifyMessages: Array<AIMessage> = [
        ...messages.slice(1),
        {role: 'user', content: buildVerifyAgentPrompt()},
      ];

      currentController = startRequest(timeoutSecs);
      let verifyResponse = '';
      try {
        const {text: verifyText, usage: verifyUsage} = await streamRequest(
          url,
          aiState.apiKey,
          model,
          verifyMessages,
          currentController.signal,
          () => undefined,
          ['\n'],
        );
        verifyResponse = verifyText;
        if (verifyUsage !== null && verifyUsage !== undefined) {
          totalPromptTokens += verifyUsage.prompt_tokens;
          totalCompletionTokens += verifyUsage.completion_tokens;
          totalCacheCreationTokens += verifyUsage.cache_creation_input_tokens ?? 0;
          totalCacheReadTokens += verifyUsage.cache_read_input_tokens ?? verifyUsage.prompt_tokens_details?.cached_tokens ?? 0;
        }
      } catch (err) {
        if (!handleAbort(err, ctx)) {
          ctx.screen.eprint(i18n.t('cmdAI.agent.error.requestFailed', 'Request failed: ') + err.message);
          throw err;
        }
        return;
      } finally {
        currentController = null;
        clearInterval(verifyTimer);
        const verifyElapsed = ((Date.now() - verifyStart) / 1000).toFixed(1);
        verifyLive.update(`${verifyingBaseMsg} <span class="agent-elapsed">(${verifyElapsed}s)</span>`);
      }

      verifyResponse = verifyResponse.trim();

      if (verifyResponse.startsWith('VERIFIED')) {
        ctx.screen.eprint(i18n.t('cmdAI.agent.result.header', '--- Agent ---'), false);
        ctx.screen.print(answer, false);
        printTokenUsage();
        return;
      }

      verifyAttempts++;

      const verifyReason = verifyResponse.startsWith('NOT_VERIFIED:')
        ? verifyResponse.slice(13).trim()
        : verifyResponse;

      ctx.screen.eprint(
        i18n.t('cmdAI.agent.result.verifyFailed', '[Agent] The answer can be improved...'),
        false,
        'line-warning',
      );

      if (verifyAttempts >= maxVerifications) {
        ctx.screen.eprint(i18n.t('cmdAI.agent.result.header', '--- Agent ---'), false);
        ctx.screen.print(answer, false);
        ctx.screen.print(
          i18n.t('cmdAI.agent.result.maxVerificationsNote', '[Agent] (max verifications reached — showing last response)'),
          false,
          'line-warning',
        );
        printTokenUsage();
        return;
      }

      step = -1;
      cmdCount = 0;

      const thinkContext =
        thinkBlocks.length > 0
          ? `\nYour previous reasoning before concluding:\n${thinkBlocks.join('\n---\n')}`
          : '';

      messages.push({
        role: 'user',
        content: `Verification failed: ${verifyReason}${thinkContext}\nPlease continue and fix the remaining issues.`,
      });

      // Flush buffered DOM writes before showing "Pensando paso 1" for the retry.
      await new Promise(resolve => requestAnimationFrame(resolve));
      // step is -1 here; after loop increment it becomes 0 → paso 1
      startThinking(step + 2);
    }
  }

  ctx.screen.print(
    i18n.t('cmdAI.agent.result.maxSteps', 'Agent reached maximum steps without a final answer.'),
  );
  printTokenUsage();
}

function cmdAIStop(ctx: CMDCallbackContext) {
  if (currentController === null || currentController === undefined) {
    ctx.screen.print(i18n.t('cmdAI.stop.noRequest', 'No active AI request to stop.'));
    return;
  }
  currentController.abort('user');
}

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
      await cmdAIAgent.call(this, {prompt, model: kwargs.model, timeout: kwargs.timeout, max_steps: kwargs.max_steps, max_verifications: kwargs.max_verifications}, ctx);
      break;
    }
    case 'stop': {
      cmdAIStop(ctx);
      break;
    }
    default: {
      ctx.screen.print(
        i18n.t('cmdAI.error.unknownOperation', 'Unknown operation: {{sub}}', {sub: operation}) +
          '\n' +
          i18n.t('cmdAI.error.usage', 'Usage: ai connect|chat|agent|stop ...'),
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
      'Connect to an AI server (OpenAI-compatible API) and chat with it, translate natural language into terminal commands, or run an autonomous agent that executes commands iteratively.',
    ),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        true,
        i18n.t('cmdAI.args.operation', 'operation: connect, chat or agent'),
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
        i18n.t('cmdAI.args.maxSteps', `Max agent iterations (agent only, default ${DEFAULT_MAX_STEPS})`),
        DEFAULT_MAX_STEPS,
      ],
      [
        ARG.Number,
        ['v', 'max-verifications'],
        false,
        i18n.t('cmdAI.args.maxVerifications', `Max verification retries (agent only, default ${DEFAULT_MAX_VERIFICATIONS})`),
        DEFAULT_MAX_VERIFICATIONS,
      ],
    ],
    example: 'connect -u http://localhost:8080/v1',
  };
}
