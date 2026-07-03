// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const content: string =
  '# SKILL: Odoo Accounting Analysis — v13\n' +
  '\n' +
  '## Model Architecture\n' +
  'Odoo 13 is a MAJOR MIGRATION version: `account.invoice` was removed and merged into `account.move`.\n' +
  'Both journal entries and invoices now live in `account.move`; the `type` field distinguishes them.\n' +
  'IMPORTANT: the field is `type` (NOT `move_type`) and payment status is `invoice_payment_state` (NOT `payment_state`) — both renamed in v14.\n' +
  '\n' +
  '## Key Models\n' +
  '- `account.move` — journal entries AND invoices / bills / credit notes\n' +
  '- `account.move.line` — all debit/credit lines (invoice lines + journal lines)\n' +
  '- `account.account` — chart of accounts · `account.journal` — journals · `account.payment` — payments · `account.tax` — taxes\n' +
  '\n' +
  '## Essential Fields — account.move\n' +
  '- `type`: entry (journal entry) | out_invoice | in_invoice | out_refund | in_refund | out_receipt | in_receipt\n' +
  '- `state`: draft | posted | cancel\n' +
  '- `invoice_payment_state`: not_paid | in_payment | paid  (only meaningful on invoice types)\n' +
  '- `invoice_date` · `invoice_date_due` · `amount_untaxed` · `amount_tax` · `amount_total` · `amount_residual` (remaining unpaid)\n' +
  '- `partner_id` · `journal_id` · `name` (sequence) · `ref` (external reference) · `currency_id`\n' +
  '\n' +
  '## Essential Fields — account.move.line\n' +
  '- `move_id` (parent) · `account_id` · `name` (label) · `debit` · `credit` · `balance` (debit − credit) · `amount_currency`\n' +
  '- `partner_id` · `date_maturity` · `reconciled` · `tax_ids` · `quantity` / `price_unit` (product lines)\n' +
  '- `parent_state` — mirrors `account.move.state`; use to filter posted lines without a join\n' +
  '\n' +
  '## Account Classification — account.account\n' +
  '`user_type_id` is a Many2one to `account.account.type` (same as v11–v12).\n' +
  '`account.account.type.type` (selection): `receivable`, `payable`, `liquidity`, `other`.\n' +
  'Filter by type: `[["user_type_id.type","=","receivable"]]`\n' +
  '\n' +
  '## Common Query Patterns\n' +
  '```\n' +
  '// Customer invoices (posted)\n' +
  'search account.move -d [["type","=","out_invoice"],["state","=","posted"]] -f name,partner_id,amount_total,invoice_payment_state,invoice_date_due\n' +
  '// Unpaid vendor bills\n' +
  'search account.move -d [["type","=","in_invoice"],["state","=","posted"],["invoice_payment_state","!=","paid"]] -f name,partner_id,amount_residual,invoice_date_due\n' +
  '// Overdue receivables\n' +
  'search account.move -d [["type","=","out_invoice"],["state","=","posted"],["invoice_payment_state","!=","paid"],["invoice_date_due","<","2024-01-01"]] -f partner_id,amount_residual,invoice_date_due\n' +
  '// Journal entry lines for posted entries\n' +
  'search account.move.line -d [["parent_state","=","posted"],["move_id.type","=","entry"]] -f account_id,debit,credit,balance,partner_id\n' +
  '// Income lines (P&L approximation)\n' +
  'search account.move.line -d [["user_type_id.type","=","other"],["parent_state","=","posted"],["account_id.user_type_id.name","like","Income"]] -f account_id,credit,debit,balance\n' +
  '// Receivable accounts\n' +
  'search account.account -d [["user_type_id.type","=","receivable"]] -f code,name\n' +
  '// Payments received\n' +
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
  '- `type` (not `move_type`) and `invoice_payment_state` (not `payment_state`) — both renames happen in v14.\n' +
  '- `amount_residual` replaced `residual` (v11–v12).\n' +
  '- `parent_state` on `account.move.line` lets you filter by posting status efficiently.\n' +
  '- Receipts: `out_receipt` / `in_receipt` are new document types introduced in v13.\n';

export default content;
