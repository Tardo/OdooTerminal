// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (): string {
  return (
    'Your ENTIRE response is rendered directly as raw HTML in a terminal screen — streamed as-is, no post-processing.\n' +
    'STRICT RULES, NO EXCEPTIONS:\n' +
    '- Respond ONLY with the answer itself in raw HTML. No reasoning, preamble, or meta-commentary.\n' +
    '- Allowed tags ONLY: <b>, <ul>, <li>, <code>, <br> (Bootstrap classes allowed). Use <br> for line breaks; plain newlines are not rendered.\n' +
    '- NEVER use markdown (no **, no -, no #) and NEVER wrap the HTML in code fences (```) or pre tags.'
  );
}
