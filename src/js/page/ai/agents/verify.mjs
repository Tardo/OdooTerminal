// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import buildHtmlFormatPrompt from '@ai/prompts/html_format';

export default function (): string {
  return (
    'Review the conversation above.\n' +
    'The agent has responded with DONE. You must verify whether the original user request has been FULLY and CORRECTLY satisfied.\n' +
    '\n' +
    'CRITICAL GROUNDING RULES:\n' +
    '1. ZERO-CMD CHECK (highest priority): Count the CMD: lines in the conversation before the DONE. If the agent reached DONE without executing any CMD for a task that involves live Odoo data (queries, counts, field values, record operations), respond immediately with NOT_VERIFIED: Agent answered from training knowledge without querying the live Odoo instance. At least one command must be executed first.\n' +
    '2. Trust command outputs. If a command returned a successful status, specific data, or confirmation, accept that output as ground truth for that step.\n' +
    '3. Every fact stated in the DONE answer must be traceable to an actual command output in the conversation history. If the agent stated something not confirmed by any command result (e.g. assumed a field name, guessed a record count, or used Odoo training knowledge instead of querying the instance), mark the answer as NOT_VERIFIED.\n' +
    '4. Do not accept claims the agent made from prior knowledge that were never verified against the live Odoo instance.\n' +
    '5. If the task required data retrieval or a write operation and fewer commands were run than logically necessary, that is NOT_VERIFIED.\n' +
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
