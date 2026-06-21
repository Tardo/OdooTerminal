// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const content: string =
  '# SKILL: Odoo Accounting Analysis — v14 / v15\n' +
  '\n' +
  '## Model Architecture\n' +
  'Same structure as v13 (`account.move` for all documents) but with two important field renames:\n' +
  '- `type` → `move_type` (document classification)\n' +
  '- `invoice_payment_state` → `payment_state` (now also has `partial` and `reversed` values)\n' +
  'Account classification still uses `user_type_id` (Many2one to `account.account.type`).\n' +
  '\n' +
  '## Key Models\n' +
  '| Model | Purpose |\n' +
  '|---|---|\n' +
  '| `account.move` | Journal entries AND invoices / bills / credit notes |\n' +
  '| `account.move.line` | All debit/credit lines |\n' +
  '| `account.account` | Chart of accounts |\n' +
  '| `account.journal` | Accounting journals |\n' +
  '| `account.payment` | Customer/vendor payments |\n' +
  '| `account.tax` | Tax definitions |\n' +
  '\n' +
  '## Essential Fields — account.move\n' +
  '| Field | Values / Notes |\n' +
  '|---|---|\n' +
  '| `move_type` | `entry` (journal entry), `out_invoice`, `in_invoice`, `out_refund`, `in_refund`, `out_receipt`, `in_receipt` |\n' +
  '| `state` | `draft`, `posted`, `cancel` |\n' +
  '| `payment_state` | `not_paid`, `in_payment`, `paid`, `partial`, `reversed`, `invoicing_legacy` |\n' +
  '| `invoice_date` | Invoice / bill date |\n' +
  '| `invoice_date_due` | Due date |\n' +
  '| `date` | Accounting date (synced with invoice_date for invoices) |\n' +
  '| `amount_untaxed` | Total before taxes |\n' +
  '| `amount_tax` | Tax amount |\n' +
  '| `amount_total` | Grand total (in company currency) |\n' +
  '| `amount_residual` | Remaining unpaid amount |\n' +
  '| `partner_id` | Customer or vendor |\n' +
  '| `journal_id` | Accounting journal |\n' +
  '| `currency_id` | Document currency |\n' +
  '| `name` | Reference / sequence number |\n' +
  '| `ref` | External reference |\n' +
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
  '| `parent_state` | Mirrors `account.move.state` — filter posted lines without a join |\n' +
  '| `tax_ids` | Applied taxes |\n' +
  '| `quantity` | Quantity (product lines) |\n' +
  '| `price_unit` | Unit price (product lines) |\n' +
  '| `display_type` | v15+: `product`, `line_section`, `line_note` — filter to `product` for real lines |\n' +
  '\n' +
  '## Account Classification — account.account\n' +
  '`user_type_id` is a Many2one to `account.account.type`.\n' +
  '`internal_type` is a related Selection: `receivable`, `payable`, `liquidity`, `other`.\n' +
  '`internal_group` is a related Selection: `asset`, `liability`, `equity`, `income`, `expense`.\n' +
  'Filter by type: `[["user_type_id.type","=","receivable"]]`\n' +
  'Filter by group: `[["internal_group","=","income"]]`\n' +
  '\n' +
  '## Common Query Patterns\n' +
  '\n' +
  '### Customer invoices (posted)\n' +
  '```\n' +
  'search account.move -d [["move_type","=","out_invoice"],["state","=","posted"]] -f name,partner_id,amount_total,payment_state,invoice_date_due\n' +
  '```\n' +
  '\n' +
  '### Unpaid vendor bills\n' +
  '```\n' +
  'search account.move -d [["move_type","=","in_invoice"],["state","=","posted"],["payment_state","!=","paid"]] -f name,partner_id,amount_residual,invoice_date_due\n' +
  '```\n' +
  '\n' +
  '### Partially paid invoices\n' +
  '```\n' +
  'search account.move -d [["move_type","=","out_invoice"],["state","=","posted"],["payment_state","=","partial"]] -f partner_id,amount_total,amount_residual\n' +
  '```\n' +
  '\n' +
  '### Overdue receivables\n' +
  '```\n' +
  'search account.move -d [["move_type","=","out_invoice"],["state","=","posted"],["payment_state","not in",["paid","reversed"]],["invoice_date_due","<","2024-01-01"]] -f partner_id,amount_residual,invoice_date_due\n' +
  '```\n' +
  '\n' +
  '### Income / revenue lines (P&L)\n' +
  '```\n' +
  'search account.move.line -d [["parent_state","=","posted"],["account_id.internal_group","=","income"]] -f account_id,credit,debit,balance\n' +
  '```\n' +
  '\n' +
  '### Trial balance for expense accounts\n' +
  '```\n' +
  'search account.move.line -d [["parent_state","=","posted"],["account_id.internal_group","=","expense"]] -f account_id,debit,credit,balance\n' +
  '```\n' +
  '\n' +
  '### Receivable accounts in chart of accounts\n' +
  '```\n' +
  'search account.account -d [["user_type_id.type","=","receivable"],["deprecated","=",false]] -f code,name\n' +
  '```\n' +
  '\n' +
  '### Payments by type\n' +
  '```\n' +
  'search account.payment -d [["state","=","posted"]] -f partner_id,payment_type,amount,date,journal_id\n' +
  '```\n' +
  '\n' +
  '## Visual Analysis\n' +
  '```\n' +
  '// Invoice totals by document type\n' +
  'graph account.move -g move_type -e amount_total -t bar\n' +
  '// Payment state distribution\n' +
  'graph account.move -g payment_state -t pie\n' +
  '// Monthly revenue trend\n' +
  'graph account.move -g invoice_date:month -e amount_untaxed -t line\n' +
  '```\n' +
  '\n' +
  '## Tips\n' +
  '- `move_type` (not `type`) and `payment_state` (not `invoice_payment_state`) in v14+.\n' +
  '- `payment_state = partial` means the invoice is partially paid — new in v14.\n' +
  '- `payment_state = reversed` means a credit note fully reversed the invoice — new in v14.\n' +
  '- `parent_state` on `account.move.line` avoids a join on `move_id.state` — prefer it.\n' +
  '- v15 introduced `display_type` on `account.move.line`; filter `display_type = product` to get only product/amount lines.\n' +
  '- `amount_total` is always in company currency; `amount_currency` holds the document currency amount.\n';

export default content;
