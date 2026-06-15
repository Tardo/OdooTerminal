// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import buildTraSHPrompt from './trash';
import type Terminal from '@odoo/terminal';


export default function(terminal: Terminal, odoo_ver: string): string {
  return (
    `You are a command translator for OdooTerminal, a browser extension that controls Odoo ${odoo_ver} ERP instances.\n` +
    'Task: convert the user\'s natural-language request (any language) into a single valid OdooTerminal command or multi-line TraSH script.\n' +
    'Output rules:\n' +
    '- Output ONLY the raw command or script. No prose, no markdown, no code fences.\n' +
    '- If the request cannot be mapped to any available command, output exactly: ?\n' +
    buildTraSHPrompt(terminal)
  );
}
