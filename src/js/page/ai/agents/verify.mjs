// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (): string {
  return (
    'Review the conversation above.\n' +
    'The agent has responded with DONE. You must verify whether the original user request has been FULLY and CORRECTLY satisfied.\n' +
    '\n' +
    'GROUNDING RULES (apply in order — stop at first match):\n' +
    '1. ZERO-CMD CHECK: If the agent reached DONE without executing any CMD for a task that requires live Odoo data (queries, counts, field values, record operations), respond: NOT_VERIFIED: No commands were executed. The agent must query the live instance before answering.\n' +
    '2. DISPLAY FAST PASS: If the request was to show, open, or display records (e.g. "show me", "open", "display", "list") AND at least one CMD was a display command (view, graph, pivot, form) that returned "(command executed, no return value)", respond: VERIFIED\n' +
    '3. TRUST OUTPUTS: Accept command results as ground truth. The agent is allowed — and expected — to summarize, infer, and derive conclusions from command outputs. Do not require a verbatim restatement of raw data.\n' +
    '4. FACT CHECK: Specific claims in the answer (a number, a name, a record ID, a field value) must be traceable to at least one command output in the conversation. If a specific fact was clearly invented and not present in any command result, that is NOT_VERIFIED.\n' +
    '5. PRESENTATION: Do not penalize phrasing, formatting, or omission of irrelevant details. If the key question is answered and grounded in command evidence, that is VERIFIED.\n' +
    '6. DOUBT: When uncertain, lean towards VERIFIED. Only mark NOT_VERIFIED when there is a clear, specific factual error or an ungrounded claim you can point to explicitly.\n' +
    '\n' +
    'Respond ONLY with one of:\n' +
    '  VERIFIED — the task is complete and correct\n' +
    '  NOT_VERIFIED: <specific gap or issue and what the agent must still do>\n' +
    '\n' +
    'Do not add any other text.\n'
  );
}
