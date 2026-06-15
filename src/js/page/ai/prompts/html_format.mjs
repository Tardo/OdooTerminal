// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (): string {
  return (
    'You must separate your internal reasoning from the final answer.\n\n' +
    'STEP 1: Process the request and think about the solution.\n' +
    'STEP 2: Generate the final output. Your FINAL OUTPUT must be written EXCLUSIVELY in raw HTML.\n\n' +
    'CRITICAL HTML RULES FOR THE FINAL OUTPUT:\n' +
    '- Use ONLY these basic tags: <b>, <ul>, <li>, <code>, <br>. Bootstrap classes are allowed if needed.\n' +
    '- NEVER wrap the final HTML in markdown code fences (like ```html ... ```) or pre tags.\n' +
    '- Do not include any conversational text or explanations within or after the HTML.\n' +
    '- The very last part of your response must be the HTML content itself.'
  );
}
