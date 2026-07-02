// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (): string {
  return (
    'Your ENTIRE response is rendered directly as raw HTML in a terminal screen — it is streamed as-is, with no post-processing.\n' +
    'CRITICAL HTML RULES (STRICT, NO EXCEPTIONS):\n' +
    '- Respond ONLY with the answer itself, written in raw HTML. No reasoning, no preamble, no meta-commentary.\n' +
    '- Use ONLY these basic tags: <b>, <ul>, <li>, <code>, <br>. Bootstrap classes are allowed if needed.\n' +
    '- NEVER use markdown (no **, no -, no #) and NEVER wrap the HTML in code fences (like ```html ... ```) or pre tags.\n' +
    '- Use <br> for line breaks; plain newlines are not rendered.'
  );
}
