// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import buildHtmlFormatPrompt from '@ai/prompts/html_format';

export default function (): string {
  return (
    'Review the conversation above.\n' +
    'The agent has responded with DONE. You must verify whether the original user request has been FULLY and CORRECTLY satisfied.\n' +
    '\n' +
    'CRITICAL GROUNDING RULES (apply in order — stop at first match):\n' +
    '1. ZERO-CMD CHECK (highest priority): Count the CMD: lines in the conversation before the DONE. If the agent reached DONE without executing any CMD for a task that involves live Odoo data (queries, counts, field values, record operations), respond immediately with: NOT_VERIFIED: Agent answered from training knowledge without querying the live Odoo instance. At least one command must be executed first.\n' +
    '2. DISPLAY-ONLY FAST PASS: If the user\'s request was to show, open, or display records/data (e.g. "show me", "open", "display", "list") AND at least one CMD was a display command (view, graph, pivot, form) that executed successfully (the output was "(command executed, no return value)"), respond immediately with: VERIFIED\n' +
    '3. Trust command outputs. If a command returned a successful status, specific data, or confirmation, accept that output as ground truth for that step.\n' +
    '4. Every fact stated in the DONE answer must be traceable to an actual command output in the conversation history. If the agent stated something not confirmed by any command result (e.g. assumed a field name, guessed a record count, or used Odoo training knowledge instead of querying the instance), mark the answer as NOT_VERIFIED.\n' +
    '5. Do not accept claims the agent made from prior knowledge that were never verified against the live Odoo instance.\n' +
    '6. If the task required data retrieval or a write operation and fewer commands were run than logically necessary, that is NOT_VERIFIED.\n' +
    '7. If the answer is a direct, literal restatement of what a command returned (a count, a single field, an ID, a list of names), that is VERIFIED — do not require the agent to restate it differently.\n' +
    '\n' +
    'Respond ONLY with one of:\n' +
    '  VERIFIED — the task is complete and correct\n' +
    '  NOT_VERIFIED: <specific gap or issue and what the agent must still do>\n' +
    '\n' +
    'Do not add any other text.\n' +
    '\n' +
    buildHtmlFormatPrompt()
  );
}
