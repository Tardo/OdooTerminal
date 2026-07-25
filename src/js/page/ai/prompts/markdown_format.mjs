// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (): string {
  return (
    'The final answer is rendered in a terminal screen by converting Markdown to HTML — write Markdown, never HTML.\n' +
    '- Respond ONLY with the answer itself. No reasoning, preamble, or meta-commentary.\n' +
    '- Use ONLY: **bold**, `code`, ```fenced code```, - lists, | pipe | tables |, # headings, and line breaks. NEVER raw HTML tags.\n' +
    '  Example — WRONG: "<b>Total:</b> 42 orders"\n' +
    '  Example — RIGHT: "**Total:** 42 orders"\n' +
    '- NEVER wrap the whole answer in a code fence.'
  );
}
