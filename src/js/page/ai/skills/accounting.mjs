// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import v11v12 from './accounting/v11_v12';
import v13 from './accounting/v13';
import v14v15 from './accounting/v14_v15';
import v16plus from './accounting/v16_plus';
import type {SkillDef} from '@ai/skills/__all__';


const skill: SkillDef = {
  name: 'accounting',
  description: 'Odoo accounting: invoices, bills, journal entries, payments, chart of accounts, P&L, aged receivables/payables. Version-specific models and fields loaded automatically.',
  content: (major: number): string => {
    if (major <= 12) return v11v12;
    if (major === 13) return v13;
    if (major <= 15) return v14v15;
    // v16, v17, v18, v19+ — and also the undetected case (major <= 0)
    const note =
      major <= 0
        ? '\n> NOTE: Odoo version could not be detected. This content targets v16+. Verify model/field names with `caf` before querying.\n'
        : '';
    return note + v16plus;
  },
};

export default skill;
