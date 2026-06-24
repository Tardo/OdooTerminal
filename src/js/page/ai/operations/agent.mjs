// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {aiState, aiRuntime} from '@ai/state';
import {streamRequest} from '@ai/providers';
import {startRequest, handleAbort} from '@ai/utils/network';
import buildMainAgentPrompt from '@ai/agents/main';
import SKILLS from '@ai/skills/__all__';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {DEFAULT_MAX_STEPS} from '@ai/constants';
import type {CMDCallbackArgs, CMDCallbackContext} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';


const AGENT_TOOLS: Array<AIToolDef> = [
  {
    name: 'run_command',
    description: 'Execute a TraSH command in OdooTerminal. Returns the serialized output or error.',
    parameters: {
      type: 'object',
      properties: {
        reason: {type: 'string', description: 'One-line description of what this command achieves'},
        cmd: {type: 'string', description: 'TraSH command to execute'},
      },
      required: ['cmd'],
    },
  },
  {
    name: 'load_skill',
    description: 'Load a skill module to access domain-specific knowledge about Odoo (field names, query patterns, TraSH syntax). Use before writing complex scripts or when uncertain about model fields.',
    parameters: {
      type: 'object',
      properties: {
        name: {type: 'string', description: 'Skill name to load'},
      },
      required: ['name'],
    },
  },
];


export default async function cmdAIAgent(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<Array<AIMessage>> {
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
  // $FlowFixMe[incompatible-type]
  const initialMessages: Array<AIMessage> = Array.isArray(kwargs.initial_messages) ? kwargs.initial_messages : [];

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
    ...initialMessages,
    {role: 'user', content: prompt},
  ];

  const loadedSkills: Set<string> = new Set();
  let cmdExecutedCount = 0;
  let cmdSuccessCount = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalCacheReadTokens = 0;

  const printTokenUsage = () => {
    if (totalPromptTokens === 0 && totalCompletionTokens === 0) {
      return;
    }
    let usageText = i18n.t('cmdAI.tokens.usage', 'Tokens: {{prompt}} in / {{completion}} out ({{total}} total)', {
      prompt: totalPromptTokens,
      completion: totalCompletionTokens,
      total: totalPromptTokens + totalCompletionTokens,
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
    aiRuntime.controller = startRequest(timeoutSecs);

    let text = '';
    let toolCalls: Array<AIToolCall> = [];

    try {
      const result = await streamRequest(
        url,
        aiState.apiKey,
        model,
        messages,
        aiRuntime.controller.signal,
        () => undefined,
        null,
        aiState.maxTokens,
        AGENT_TOOLS,
      );
      text = result.text;
      toolCalls = result.toolCalls;
      const {usage} = result;
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
      return messages.slice(1);
    } finally {
      aiRuntime.controller = null;
      if (thinkTimer !== null) {
        clearInterval(thinkTimer);
        thinkTimer = null;
      }
      const thinkElapsed = ((Date.now() - thinkStart) / 1000).toFixed(1);
      thinkLive?.update(`${thinkingBaseMsg} <span class="agent-elapsed">(${thinkElapsed}s)</span>`);
    }

    // Build assistant message with both text and tool_use blocks
    const assistantContent: Array<AIContentBlock> = [];
    if (text) {
      assistantContent.push({type: 'text', text});
    }
    for (const tc of toolCalls) {
      assistantContent.push({type: 'tool_use', id: tc.id, name: tc.name, input: tc.input});
    }
    messages.push({role: 'assistant', content: assistantContent});

    // No tool calls → final answer
    if (toolCalls.length === 0) {
      if (cmdExecutedCount === 0) {
        messages.push({
          role: 'user',
          content:
            'You must call run_command at least once before providing a final answer for tasks involving Odoo data. ' +
            'Execute a command now.',
        });
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (step + 1 < maxSteps) {
          startThinking(step + 2);
        }
        continue;
      }
      if (cmdSuccessCount === 0) {
        messages.push({
          role: 'user',
          content:
            'All your commands have failed. You must not fabricate results. ' +
            'Either try a different command approach or report the failure honestly.',
        });
        cmdSuccessCount = -1;
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (step + 1 < maxSteps) {
          startThinking(step + 2);
        }
        continue;
      }

      // Strip and display <think> blocks from final answer
      let finalText = text.trim();
      const thinkMatches = [...finalText.matchAll(/<think>([\s\S]*?)<\/think>/g)];
      const thinkBlocks: Array<string> = thinkMatches.map(m => m[1].trim());
      finalText = finalText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      finalText = finalText.replace(/<\/?think>/g, '').trim();
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

      if (finalText) {
        ctx.screen.eprint(i18n.t('cmdAI.agent.result.header', '--- Agent ---'), false);
        ctx.screen.print(finalText, false);
      }
      printTokenUsage();
      return messages.slice(1);
    }

    // Process tool calls
    const toolResults: Array<AIContentBlock> = [];

    for (const tc of toolCalls) {
      if (tc.name === 'run_command') {
        const cmd = String(tc.input.cmd ?? '').trim();
        const reason = String(tc.input.reason ?? '');

        if (reason) {
          ctx.screen.print(
            i18n.t('cmdAI.agent.result.cmdReason', '[Agent] {{reason}}', {reason}),
            false,
          );
        }

        const registeredCmds = this.getShell().getVM().getRegisteredCmds();
        const isUnsafe = cmd.split(';').map(part => part.trim().split(/\s+/)[0]).filter(Boolean)
          .some(name => registeredCmds[name]?.unsafe);

        if (isUnsafe) {
          const question = reason
            ? i18n.t('cmdAI.agent.unsafe.questionWithReason', '[Agent] {{reason}} — Unsafe command: {{cmd}} — Execute?', {reason, cmd})
            : i18n.t('cmdAI.agent.unsafe.question', '[Agent] Unsafe command: {{cmd}} — Execute?', {cmd});
          const answer = await ctx.screen.showQuestion(question, ['y', 'n'], 'n');
          if (answer?.toLowerCase() !== 'y') {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tc.id,
              content: i18n.t('cmdAI.agent.unsafe.rejected', 'Command rejected by user: {{cmd}}', {cmd}),
            });
            continue;
          }
        }

        ctx.screen.print(
          i18n.t('cmdAI.agent.result.running', '[Agent] Running: <code>{{cmd}}</code>', {cmd}),
          false,
        );

        let outputStr = '';
        let cmdFailed = false;
        try {
          // $FlowFixMe[incompatible-type]
          const result: mixed = await this.executeAll(cmd, false, true, false, false);
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

        cmdExecutedCount++;
        if (!cmdFailed) {
          cmdSuccessCount++;
        }

        const MAX_CMD_OUTPUT_CHARS = 6000;
        if (outputStr.length > MAX_CMD_OUTPUT_CHARS) {
          outputStr = outputStr.slice(0, MAX_CMD_OUTPUT_CHARS) + `\n[output truncated — ${outputStr.length} chars total, showing first ${MAX_CMD_OUTPUT_CHARS}]`;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: tc.id,
          content: cmdFailed ? `Command failed:\n${outputStr}` : `Command output:\n${outputStr}`,
        });

      } else if (tc.name === 'load_skill') {
        const skillName = String(tc.input.name ?? '').trim();
        const skill = SKILLS.find(s => s.name === skillName);

        let skillContent = '';

        if (skill === undefined) {
          skillContent = i18n.t('cmdAI.agent.skill.unknown', 'Skill not found: {{name}}. Available: {{list}}', {
            name: skillName,
            list: SKILLS.map(s => s.name).join(', '),
          });
        } else if (loadedSkills.has(skillName)) {
          skillContent = i18n.t('cmdAI.agent.skill.alreadyLoaded', 'Skill already loaded: {{name}}', {name: skillName});
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
          skillContent = `Skill loaded: ${skillName}\n${skill.content(major)}`;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: tc.id,
          content: skillContent,
        });

      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tc.id,
          content: `Unknown tool: ${tc.name}`,
        });
      }
    }

    messages.push({role: 'user', content: toolResults});

    // print/eprint route through a requestAnimationFrame buffer, while printLive
    // appends synchronously. Awaiting one rAF here ensures any command output or
    // error printed by execute() lands in the DOM before the next thinking element.
    await new Promise(resolve => requestAnimationFrame(resolve));

    if (step + 1 < maxSteps) {
      startThinking(step + 2);
    }
  }

  ctx.screen.print(
    i18n.t('cmdAI.agent.result.maxSteps', 'Agent reached maximum steps without a final answer.'),
  );
  printTokenUsage();
  return messages.slice(1);
}
