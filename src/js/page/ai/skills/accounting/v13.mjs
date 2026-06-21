// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const content: string =
  '# SKILL: Odoo Accounting Analysis — v13\n' +
  '\n' +
  '## Model Architecture\n' +
  'Odoo 13 is a MAJOR MIGRATION version: `account.invoice` was removed and merged into `account.move`.\n' +
  'Both journal entries and invoices now live in `account.move`; the `type` field distinguishes them.\n' +
  'IMPORTANT: In v13 the field is called `type` (NOT `move_type` — that rename happened in v14).\n' +
  'IMPORTANT: Payment status is `invoice_payment_state` (NOT `payment_state` — renamed in v14).\n' +
  '\n' +
  '## Key Models\n' +
  '| Model | Purpose |\n' +
  '|---|---|\n' +
  '| `account.move` | Journal entries AND invoices / bills / credit notes |\n' +
  '| `account.move.line` | All debit/credit lines (invoice lines + journal lines) |\n' +
  '| `account.account` | Chart of accounts |\n' +
  '| `account.journal` | Accounting journals |\n' +
  '| `account.payment` | Customer/vendor payments |\n' +
  '| `account.tax` | Tax definitions |\n' +
  '\n' +
  '## Essential Fields — account.move\n' +
  '| Field | Values / Notes |\n' +
  '|---|---|\n' +
  '| `type` | `entry` (journal entry), `out_invoice`, `in_invoice`, `out_refund`, `in_refund`, `out_receipt`, `in_receipt` |\n' +
  '| `state` | `draft`, `posted`, `cancel` |\n' +
  '| `invoice_payment_state` | `not_paid`, `in_payment`, `paid` (only meaningful on invoice types) |\n' +
  '| `invoice_date` | Invoice / bill date |\n' +
  '| `invoice_date_due` | Due date |\n' +
  '| `amount_untaxed` | Total before taxes |\n' +
  '| `amount_tax` | Tax amount |\n' +
  '| `amount_total` | Grand total |\n' +
  '| `amount_residual` | Remaining unpaid amount |\n' +
  '| `partner_id` | Customer or vendor |\n' +
  '| `journal_id` | Accounting journal |\n' +
  '| `name` | Reference / sequence number |\n' +
  '| `ref` | External reference |\n' +
  '| `currency_id` | Currency |\n' +
  '\n' +
  '## Essential Fields — account.move.line\n' +
  '| Field | Notes |\n' +
  '|---|---|\n' +
  '| `move_id` | Parent journal entry / invoice |\n' +
  '| `account_id` | Ledger account |\n' +
  '| `name` | Label / description |\n' +
  '| `debit` | Debit amount |\n' +
  '| `credit` | Credit amount |\n' +
  '| `balance` | debit − credit |\n' +
  '| `amount_currency` | Amount in line currency |\n' +
  '| `partner_id` | Partner on the line |\n' +
  '| `date_maturity` | Maturity date |\n' +
  '| `reconciled` | Fully reconciled? |\n' +
  '| `parent_state` | Mirrors `account.move.state` — use to filter posted lines without a join |\n' +
  '| `tax_ids` | Applied taxes |\n' +
  '| `quantity` | Quantity (product lines) |\n' +
  '| `price_unit` | Unit price (product lines) |\n' +
  '\n' +
  '## Account Classification — account.account\n' +
  '`account.account.user_type_id` is a Many2one to `account.account.type` (same as v11–v12).\n' +
  '`account.account.type.type` (selection): `receivable`, `payable`, `liquidity`, `other`.\n' +
  'Filter by type: `[["user_type_id.type","=","receivable"]]`\n' +
  '\n' +
  '## Common Query Patterns\n' +
  '\n' +
  '### Customer invoices (posted)\n' +
  '```\n' +
  'search account.move -d [["type","=","out_invoice"],["state","=","posted"]] -f name,partner_id,amount_total,invoice_payment_state,invoice_date_due\n' +
  '```\n' +
  '\n' +
  '### Unpaid vendor bills\n' +
  '```\n' +
  'search account.move -d [["type","=","in_invoice"],["state","=","posted"],["invoice_payment_state","!=","paid"]] -f name,partner_id,amount_residual,invoice_date_due\n' +
  '```\n' +
  '\n' +
  '### Overdue receivables\n' +
  '```\n' +
  'search account.move -d [["type","=","out_invoice"],["state","=","posted"],["invoice_payment_state","!=","paid"],["invoice_date_due","<","2024-01-01"]] -f partner_id,amount_residual,invoice_date_due\n' +
  '```\n' +
  '\n' +
  '### Journal entry lines for posted entries\n' +
  '```\n' +
  'search account.move.line -d [["parent_state","=","posted"],["move_id.type","=","entry"]] -f account_id,debit,credit,balance,partner_id\n' +
  '```\n' +
  '\n' +
  '### Income lines (P&L approximation)\n' +
  '```\n' +
  'search account.move.line -d [["user_type_id.type","=","other"],["parent_state","=","posted"],["account_id.user_type_id.name","like","Income"]] -f account_id,credit,debit,balance\n' +
  '```\n' +
  '\n' +
  '### Receivable accounts\n' +
  '```\n' +
  'search account.account -d [["user_type_id.type","=","receivable"]] -f code,name\n' +
  '```\n' +
  '\n' +
  '### Payments received\n' +
  '```\n' +
  'search account.payment -d [["payment_type","=","inbound"],["state","=","posted"]] -f partner_id,amount,date,journal_id\n' +
  '```\n' +
  '\n' +
  '## Visual Analysis\n' +
  '```\n' +
  '// Invoice totals by type\n' +
  'graph account.move -g type -e amount_total -t bar\n' +
  '// Payment state breakdown for customer invoices\n' +
  'graph account.move -g invoice_payment_state -t pie\n' +
  '```\n' +
  '\n' +
  '## Tips\n' +
  '- `type` (not `move_type`) — that rename happens in v14.\n' +
  '- `invoice_payment_state` (not `payment_state`) — that rename also happens in v14.\n' +
  '- `amount_residual` replaced `residual` (v11–v12).\n' +
  '- `parent_state` on `account.move.line` lets you filter by posting status efficiently.\n' +
  '- Receipts: `out_receipt` / `in_receipt` are new document types introduced in v13.\n';

export default content;
