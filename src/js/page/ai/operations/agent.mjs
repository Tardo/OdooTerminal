// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {aiState, aiRuntime} from '@ai/state';
import {streamRequest} from '@ai/providers';
import {startRequest, handleAbort} from '@ai/utils/network';
import buildMainAgentPrompt from '@ai/agents/main';
import SKILLS from '@ai/skills/__all__';
import type {SkillDef} from '@ai/skills/__all__';
import {listMCPTools, callMCPTool, slugifyServerName, buildMCPToolName} from '@ai/mcp/client';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {DEFAULT_MAX_STEPS} from '@ai/constants';
import {computeContextSize, shouldCompress, compressHistory} from '@ai/utils/compress_history';
import searchRead from '@odoo/orm/search_read';
import captureScreenshot from '@ai/utils/capture_screenshot';
import describeCommandError from '@ai/utils/describe_command_error';
import encodeHTML from '@terminal/utils/encode_html';
import type {CMDCallbackArgs, CMDCallbackContext} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';


// Weak models sometimes ignore the "raw HTML only" instruction and answer in
// markdown/plain text despite the prompt reminders. Deterministic fallback:
// only touches text that has no allowed HTML tags in it already.
function coerceToAllowedHtml(text: string): string {
  if (/<\/?(b|ul|li|code|br)\b/i.test(text)) {
    return text;
  }
  let html = text
    .replace(/```([\s\S]*?)```/g, (_m, code) => `<code>${code.trim()}</code>`)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/^\s*#{1,6}\s+(.+)$/gm, '<b>$1</b>');
  html = html.replace(/(^|\n)((?:[ \t]*[-*][ \t]+.+(?:\n|$))+)/g, (_m, pre, block) => {
    const items = block
      .trim()
      .split('\n')
      .map(line => `<li>${line.replace(/^[ \t]*[-*][ \t]+/, '')}</li>`)
      .join('');
    return `${pre}<ul>${items}</ul>`;
  });
  return html.replace(/\n+/g, '<br>');
}

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
  {
    name: 'take_screenshot',
    description:
      'LAST RESORT: capture a screenshot of the current browser page (visible viewport only — off-screen content is not included). ' +
      'Follow the SCREENSHOTS system-prompt rules: try run_command alternatives (inspect, read/search, form -o get) first. ' +
      'The user must confirm each capture. Requires a vision-capable model.',
    parameters: {
      type: 'object',
      properties: {
        reason: {type: 'string', description: 'One-line description of why you need the screenshot'},
        selector: {
          type: 'string',
          description: 'Optional CSS selector to crop the screenshot to a specific DOM element. Omit to capture the full visible viewport.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_attachment',
    description:
      'Fetch a binary attachment from Odoo (ir.attachment) by id and inject its content into the conversation for reading. ' +
      'PDFs/images are injected directly (Anthropic provider only); text files are decoded inline; other formats return a description. ' +
      'Follow the ODOO ATTACHMENTS system-prompt workflow: discover ids with run_command first; if multiple match, list them and wait for the user — do NOT auto-pick.',
    parameters: {
      type: 'object',
      properties: {
        id: {type: 'number', description: 'The ir.attachment record id to fetch'},
      },
      required: ['id'],
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
  const customSystemPrompt: ?string = typeof kwargs.custom_system_prompt === 'string' && kwargs.custom_system_prompt.trim() ? kwargs.custom_system_prompt : null;
  // $FlowFixMe[incompatible-type]
  const rawInitialMessages: Array<AIMessage> = Array.isArray(kwargs.initial_messages) ? kwargs.initial_messages : [];
  // Strip stale cache_control markers left by the rolling-breakpoint mechanism
  // in previous turns — the API allows at most 4 blocks with cache_control and
  // the agent places fresh markers each turn, so old ones must not accumulate.
  const initialMessages: Array<AIMessage> = rawInitialMessages.map(msg => {
    if (typeof msg.content === 'string') {
      return msg;
    }
    return {
      role: msg.role,
      content: msg.content.map(block => {
        if (block.type === 'text' && block.cache_control !== undefined) {
          return {type: 'text', text: block.text};
        } else if (block.type === 'tool_result' && block.cache_control !== undefined) {
          return {type: 'tool_result', tool_use_id: block.tool_use_id, content: block.content};
        } else if (block.type === 'image' && block.cache_control !== undefined) {
          return {type: 'image', source: block.source};
        } else if (block.type === 'document' && block.cache_control !== undefined) {
          return {type: 'document', source: block.source};
        }
        return block;
      }),
    };
  });
  // $FlowFixMe[incompatible-type]
  const attachments: Array<AIAttachment> = Array.isArray(kwargs.attachments) ? kwargs.attachments : [];

  const hasAttachments = attachments.length > 0;

  const userContent: string | Array<AIContentBlock> = (() => {
    if (!hasAttachments) {
      return prompt;
    }
    const blocks: Array<AIContentBlock> = [];
    if (prompt) {
      blocks.push({type: 'text', text: prompt});
    }
    for (const att of attachments) {
      if (att.media_type.startsWith('image/')) {
        blocks.push({type: 'image', source: {type: 'base64', media_type: att.media_type, data: att.data}});
      } else if (att.media_type === 'application/pdf') {
        blocks.push({type: 'document', source: {type: 'base64', media_type: att.media_type, data: att.data}});
      } else if (att.media_type.startsWith('text/')) {
        let text: string;
        try {
          text = decodeURIComponent(escape(atob(att.data)));
        } catch (_) {
          text = att.data;
        }
        blocks.push({type: 'text', text: `[File: ${att.name}]\n${text}`});
      } else {
        blocks.push({type: 'text', text: `[File: ${att.name} (${att.media_type})]`});
      }
    }
    // Mark last block so Anthropic caches the system+user prefix across agent steps
    if (aiState.provider === 'anthropic' && blocks.length > 0) {
      const last = blocks[blocks.length - 1];
      if (last.type === 'text') {
        blocks[blocks.length - 1] = {type: 'text', text: last.text, cache_control: {type: 'ephemeral'}};
      } else if (last.type === 'image') {
        blocks[blocks.length - 1] = {type: 'image', source: last.source, cache_control: {type: 'ephemeral'}};
      } else if (last.type === 'document') {
        blocks[blocks.length - 1] = {type: 'document', source: last.source, cache_control: {type: 'ephemeral'}};
      }
    }
    return blocks;
  })();

  const customSkillDefs: Array<SkillDef> = this.getCustomSkills().map(cs => ({
    name: cs.name,
    description: cs.description,
    content: () => cs.content,
  }));
  const allSkills: Array<SkillDef> = [
    ...SKILLS.filter(s => !customSkillDefs.some(cs => cs.name === s.name)),
    ...customSkillDefs,
  ];

  // Discover tools from enabled MCP servers up front so they can be offered to the model
  // alongside the native tools. A short per-server timeout keeps one unreachable server
  // from stalling the whole agent run — it is simply skipped with a warning.
  const mcpToolDefs: Array<AIToolDef> = [];
  const mcpToolMap: Map<string, {server: MCPServerConfig, toolName: string}> = new Map();
  for (const server of this.getMCPServers().filter(s => s.enabled)) {
    const discovery = startRequest(8);
    try {
      const tools = await listMCPTools(server, discovery.signal);
      const slug = slugifyServerName(server.name);
      for (const tool of tools) {
        const fullName = buildMCPToolName(slug, tool.name);
        mcpToolMap.set(fullName, {server, toolName: tool.name});
        mcpToolDefs.push({
          name: fullName,
          description: `[MCP:${server.name}] ${tool.description || tool.name}`,
          parameters: tool.inputSchema,
        });
      }
    } catch (err) {
      ctx.screen.print(
        i18n.t('cmdAI.agent.mcp.discoveryFailed', '[Agent] MCP server "{{name}}" unavailable, skipping: {{error}}', {
          name: server.name,
          error: err.message,
        }),
        false,
      );
    }
  }
  const agentTools: Array<AIToolDef> = [...AGENT_TOOLS, ...mcpToolDefs];
  // Servers are confirmed once per conversation (persists across agent steps/invocations within
  // the same conversation via Terminal — see getMCPConfirmedServers), not on every tool call.
  const confirmedMCPServers: Set<string> = this.getMCPConfirmedServers();

  // Unsafe-command confirmation for agent-driven execution. The guard runs at the
  // real invocation point (VMachine.#invokeFunction), so it can't be bypassed by
  // hiding an unsafe command in a loop body, nested call, or assignment — unlike
  // static parsing of the command string. Confirmed once per command name per
  // task, so a loop over one unsafe command prompts a single time.
  const confirmedUnsafe: Set<string> = new Set();
  const unsafeCmdGuard = async (cmdName: string): Promise<boolean> => {
    if (confirmedUnsafe.has(cmdName)) {
      return true;
    }
    const question = i18n.t('cmdAI.agent.unsafe.question', '[Agent] Unsafe command: {{cmd}} — Execute?', {cmd: cmdName});
    const answer = await ctx.screen.showQuestion(question, ['y', 'n'], 'n');
    if (answer?.toLowerCase() === 'y') {
      confirmedUnsafe.add(cmdName);
      return true;
    }
    return false;
  };

  const messages: Array<AIMessage> = [
    {
      role: 'system',
      content: [
        {
          type: 'text',
          text: buildMainAgentPrompt(this, String(getOdooVersion() ?? ''), maxSteps, customSystemPrompt, allSkills),
          cache_control: {type: 'ephemeral'},
        },
      ],
    },
    ...initialMessages,
    {role: 'user', content: userContent},
  ];

  const loadedSkills: Set<string> = new Set();
  let cmdExecutedCount = 0;
  let cmdSuccessCount = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalCacheReadTokens = 0;
  let lastContextSize = 0;
  // Index of the messages[] entry that carries the rolling Anthropic cache breakpoint.
  let rollingBreakpointMsgIdx = -1;

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
        agentTools,
      );
      text = result.text;
      toolCalls = result.toolCalls;
      const {usage} = result;
      if (usage !== null && usage !== undefined) {
        totalPromptTokens += usage.prompt_tokens;
        totalCompletionTokens += usage.completion_tokens;
        totalCacheCreationTokens += usage.cache_creation_input_tokens ?? 0;
        totalCacheReadTokens += usage.cache_read_input_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0;
        lastContextSize = computeContextSize(usage, aiState.provider);
      }
    } catch (err) {
      if (!handleAbort(err, ctx)) {
        ctx.screen.eprint(i18n.t('cmdAI.agent.error.requestFailed', 'Request failed: ') + err.message, false, 'error_message');
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
      if (cmdExecutedCount > 0 && cmdSuccessCount === 0) {
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
        ctx.screen.print(coerceToAllowedHtml(finalText), false);
      }
      printTokenUsage();
      return messages.slice(1);
    }

    // Process tool calls
    const toolResults: Array<AIContentBlock> = [];
    // document/image blocks fetched by get_attachment, appended as siblings in the same user message
    const siblingDocBlocks: Array<AIContentBlock> = [];

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

        const safeCmd = encodeHTML(cmd);
        ctx.screen.print(
          i18n.t('cmdAI.agent.result.running', '[Agent] Running: <code>{{cmd}}</code>', {cmd}) +
            ` <span class='agent-rerun o_terminal_click o_terminal_cmd' data-cmd='${safeCmd}' title='Re-run'><i class='fa fa-repeat'></i></span>`,
          false,
        );

        let outputStr = '';
        let cmdFailed = false;
        this.setUnsafeCmdGuard(unsafeCmdGuard);
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
          outputStr = describeCommandError(err);
        } finally {
          this.clearUnsafeCmdGuard();
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
        const skill = allSkills.find(s => s.name === skillName);

        let skillContent = '';

        if (skill === undefined) {
          skillContent = i18n.t('cmdAI.agent.skill.unknown', 'Skill not found: {{name}}. Available: {{list}}', {
            name: skillName,
            list: allSkills.map(s => s.name).join(', '),
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

      } else if (tc.name === 'get_attachment') {
        const attachId = tc.input.id !== null && tc.input.id !== undefined ? Number(tc.input.id) : NaN;
        if (isNaN(attachId)) {
          toolResults.push({type: 'tool_result', tool_use_id: tc.id, content: 'Error: id parameter is required'});
        } else {
          const question = i18n.t(
            'cmdAI.agent.attachment.question',
            '[Agent] Read attachment {{id}} and send its content to the AI — Allow?',
            {id: attachId},
          );
          const answer = await ctx.screen.showQuestion(question, ['y', 'n'], 'n');
          if (answer?.toLowerCase() !== 'y') {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tc.id,
              content: i18n.t('cmdAI.agent.attachment.rejected', 'Attachment access rejected by user.'),
            });
            continue;
          }
          ctx.screen.print(
            i18n.t('cmdAI.agent.result.fetchingAttachment', '[Agent] Fetching attachment {{id}}', {id: attachId}),
            false,
          );
          try {
            const context = await this.getContext();
            const records = await searchRead(
              'ir.attachment',
              [['id', '=', attachId]],
              ['name', 'mimetype', 'datas'],
              context,
            );
            if (!records || records.length === 0) {
              toolResults.push({type: 'tool_result', tool_use_id: tc.id, content: `Attachment ${attachId} not found.`});
            } else {
              const rec = records[0];
              const attName = String(rec.name || `attachment_${attachId}`);
              const mimetype = String(rec.mimetype || 'application/octet-stream');
              const data = String(rec.datas || '');
              if (!data) {
                toolResults.push({type: 'tool_result', tool_use_id: tc.id, content: `Attachment "${attName}" has no binary data.`});
              } else if (aiState.provider === 'anthropic' && mimetype === 'application/pdf') {
                toolResults.push({type: 'tool_result', tool_use_id: tc.id, content: `Fetched PDF "${attName}" (id=${attachId}). The document follows — read it to complete the task.`});
                siblingDocBlocks.push({type: 'document', source: {type: 'base64', media_type: mimetype, data}});
              } else if (aiState.provider === 'anthropic' && mimetype.startsWith('image/')) {
                toolResults.push({type: 'tool_result', tool_use_id: tc.id, content: `Fetched image "${attName}" (id=${attachId}). The image follows.`});
                siblingDocBlocks.push({type: 'image', source: {type: 'base64', media_type: mimetype, data}});
              } else if (mimetype.startsWith('text/')) {
                let fileText;
                try {
                  fileText = decodeURIComponent(escape(atob(data)));
                } catch (_) {
                  fileText = data;
                }
                const truncated = fileText.length > 6000 ? fileText.slice(0, 6000) + `\n[truncated — ${fileText.length} chars total]` : fileText;
                toolResults.push({type: 'tool_result', tool_use_id: tc.id, content: `File "${attName}":\n${truncated}`});
              } else {
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: tc.id,
                  content: `Attachment "${attName}" (${mimetype}) — binary content cannot be read inline. For PDFs and images, use the Anthropic provider.`,
                });
              }
            }
          } catch (err) {
            toolResults.push({type: 'tool_result', tool_use_id: tc.id, content: `Error fetching attachment: ${err.message}`});
          }
        }

      } else if (tc.name === 'take_screenshot') {
        const reason = String(tc.input.reason ?? '');
        const rawSelector = tc.input.selector;
        const selector: string | null =
          rawSelector !== null && rawSelector !== undefined ? String(rawSelector) : null;
        const selectorLabel = selector !== null ? ` of "${selector}"` : '';

        const question = reason
          ? i18n.t('cmdAI.agent.screenshot.questionWithReason', '[Agent] {{reason}} — Take screenshot{{sel}} — Allow?', {reason, sel: selectorLabel})
          : i18n.t('cmdAI.agent.screenshot.question', '[Agent] Take screenshot{{sel}} — Allow?', {sel: selectorLabel});
        const answer = await ctx.screen.showQuestion(question, ['y', 'n'], 'n');
        if (answer?.toLowerCase() !== 'y') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tc.id,
            content: i18n.t('cmdAI.agent.screenshot.rejected', 'Screenshot rejected by user.'),
          });
          continue;
        }

        ctx.screen.print(
          i18n.t('cmdAI.agent.screenshot.capturing', '[Agent] Capturing screenshot...'),
          false,
        );

        try {
          const base64 = await captureScreenshot(this, selector);
          ctx.screen.printAttachments([{name: 'screenshot.png', media_type: 'image/png', data: base64}]);
          const captureLabel =
            selector !== null
              ? `Screenshot captured (cropped to: ${selector}).`
              : 'Screenshot captured (full viewport).';
          toolResults.push({type: 'tool_result', tool_use_id: tc.id, content: captureLabel + ' The image follows.'});
          siblingDocBlocks.push({type: 'image', source: {type: 'base64', media_type: 'image/png', data: base64}});
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tc.id,
            content: `Screenshot failed: ${err.message}`,
          });
        }

      } else if (mcpToolMap.has(tc.name)) {
        const mcpEntry = mcpToolMap.get(tc.name);
        if (mcpEntry === undefined) {
          toolResults.push({type: 'tool_result', tool_use_id: tc.id, content: `Unknown tool: ${tc.name}`});
          continue;
        }
        const {server, toolName} = mcpEntry;

        if (!confirmedMCPServers.has(server.name)) {
          const question = i18n.t(
            'cmdAI.agent.mcp.question',
            '[Agent] Wants to use tools from MCP server "{{name}}" ({{url}}) — Allow for this conversation?',
            {name: server.name, url: server.url},
          );
          const answer = await ctx.screen.showQuestion(question, ['y', 'n'], 'n');
          if (answer?.toLowerCase() !== 'y') {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tc.id,
              content: i18n.t('cmdAI.agent.mcp.rejected', 'MCP server "{{name}}" rejected by user.', {name: server.name}),
            });
            continue;
          }
          confirmedMCPServers.add(server.name);
        }

        ctx.screen.print(
          i18n.t('cmdAI.agent.mcp.calling', '[Agent] Calling MCP tool: <code>{{tool}}</code> ({{server}})', {
            tool: toolName,
            server: server.name,
          }),
          false,
        );

        const callController = startRequest(server.timeout || 30);
        try {
          const {text: mcpText, isError} = await callMCPTool(server, toolName, tc.input, callController.signal);
          let outputStr = mcpText || (isError ? 'MCP tool failed with no message' : '(no output)');
          const MAX_MCP_OUTPUT_CHARS = 6000;
          if (outputStr.length > MAX_MCP_OUTPUT_CHARS) {
            outputStr = outputStr.slice(0, MAX_MCP_OUTPUT_CHARS) + `\n[output truncated — ${outputStr.length} chars total, showing first ${MAX_MCP_OUTPUT_CHARS}]`;
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tc.id,
            content: isError ? `MCP tool failed:\n${outputStr}` : `MCP tool output:\n${outputStr}`,
          });
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tc.id,
            content: `MCP tool call failed: ${err.message}`,
          });
        }

      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tc.id,
          content: `Unknown tool: ${tc.name}`,
        });
      }
    }

    // Build the full user-turn content: tool results first, then any fetched binaries as siblings.
    const userMsgContent: Array<AIContentBlock> = [...toolResults, ...siblingDocBlocks];

    // Rolling cache breakpoint for Anthropic: clear the previous breakpoint from the
    // message that held it, then mark the last content block of the new user message.
    // This keeps [system_cached ... last_tool_result_or_doc_cached] as the stable prefix,
    // so the next request reads most of the context from cache.
    if (aiState.provider === 'anthropic') {
      if (rollingBreakpointMsgIdx >= 0) {
        const prev = messages[rollingBreakpointMsgIdx];
        if (Array.isArray(prev.content) && prev.content.length > 0) {
          const prevContent = prev.content;
          const last = prevContent[prevContent.length - 1];
          let stripped: AIContentBlock;
          if (last.type === 'text') {
            stripped = {type: 'text', text: last.text};
          } else if (last.type === 'tool_result') {
            stripped = {type: 'tool_result', tool_use_id: last.tool_use_id, content: last.content};
          } else if (last.type === 'document') {
            stripped = {type: 'document', source: last.source};
          } else if (last.type === 'image') {
            stripped = {type: 'image', source: last.source};
          } else {
            stripped = last;
          }
          messages[rollingBreakpointMsgIdx] = {
            role: prev.role,
            content: [...prevContent.slice(0, -1), stripped],
          };
        }
      }

      if (userMsgContent.length > 0) {
        const lastBlock = userMsgContent[userMsgContent.length - 1];
        let marked: AIContentBlock;
        if (lastBlock.type === 'tool_result') {
          marked = {type: 'tool_result', tool_use_id: lastBlock.tool_use_id, content: lastBlock.content, cache_control: {type: 'ephemeral'}};
        } else if (lastBlock.type === 'document') {
          marked = {type: 'document', source: lastBlock.source, cache_control: {type: 'ephemeral'}};
        } else if (lastBlock.type === 'image') {
          marked = {type: 'image', source: lastBlock.source, cache_control: {type: 'ephemeral'}};
        } else {
          marked = lastBlock;
        }
        userMsgContent[userMsgContent.length - 1] = marked;
      }
    }

    messages.push({role: 'user', content: userMsgContent});

    if (aiState.provider === 'anthropic') {
      rollingBreakpointMsgIdx = messages.length - 1;
    }

    // Compress history when approaching the provider's context window limit.
    if (shouldCompress(lastContextSize, aiState.provider)) {
      const compressed = compressHistory(messages);
      messages.splice(0, messages.length, ...compressed);
      if (aiState.provider === 'anthropic') {
        rollingBreakpointMsgIdx = messages.length - 1;
      }
    }

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
