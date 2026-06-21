// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const content: string =
  '# SKILL: Odoo Accounting Analysis — v16 / v17 / v18 / v19+\n' +
  '\n' +
  '## Model Architecture\n' +
  'Same `account.move` structure as v14–v15 with one major change: `account.account.user_type_id`\n' +
  '(Many2one) was replaced by `account.account.account_type` (Selection field with 18 values).\n' +
  'The `account.account.type` model no longer exists.\n' +
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
  '| `account.bank.statement` | Bank statement reconciliation |\n' +
  '| `account.bank.statement.line` | Bank statement lines (v16+ used for reconciliation) |\n' +
  '\n' +
  '## Essential Fields — account.move\n' +
  '| Field | Values / Notes |\n' +
  '|---|---|\n' +
  '| `move_type` | `entry` (journal entry), `out_invoice`, `in_invoice`, `out_refund`, `in_refund`, `out_receipt`, `in_receipt` |\n' +
  '| `state` | `draft`, `posted`, `cancel` |\n' +
  '| `payment_state` | `not_paid`, `in_payment`, `paid`, `partial`, `reversed`, `invoicing_legacy` |\n' +
  '| `invoice_date` | Invoice / bill date |\n' +
  '| `invoice_date_due` | Due date |\n' +
  '| `date` | Accounting date |\n' +
  '| `amount_untaxed` | Total before taxes |\n' +
  '| `amount_tax` | Tax amount |\n' +
  '| `amount_total` | Grand total (in company currency) |\n' +
  '| `amount_residual` | Remaining unpaid amount |\n' +
  '| `amount_untaxed_signed` | Signed amount (negative for outbound) |\n' +
  '| `partner_id` | Customer or vendor |\n' +
  '| `journal_id` | Accounting journal |\n' +
  '| `currency_id` | Document currency |\n' +
  '| `name` | Reference / sequence number |\n' +
  '| `ref` | External reference |\n' +
  '| `narration` | Notes (HTML) |\n' +
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
  '| `full_reconcile_id` | Full reconcile record |\n' +
  '| `parent_state` | Mirrors `account.move.state` — use to filter posted lines without a join |\n' +
  '| `tax_ids` | Applied taxes |\n' +
  '| `quantity` | Quantity (product lines) |\n' +
  '| `price_unit` | Unit price (product lines) |\n' +
  '| `display_type` | `product`, `line_section`, `line_note` — filter to `product` for real lines |\n' +
  '\n' +
  '## Account Classification — account.account (v16+)\n' +
  '`user_type_id` is GONE. Use `account_type` (Selection field, stored + computed).\n' +
  '\n' +
  '| `account_type` value | Label |\n' +
  '|---|---|\n' +
  '| `asset_receivable` | Receivable |\n' +
  '| `asset_cash` | Bank and Cash |\n' +
  '| `asset_current` | Current Assets |\n' +
  '| `asset_non_current` | Non-current Assets |\n' +
  '| `asset_prepayments` | Prepayments |\n' +
  '| `asset_fixed` | Fixed Assets |\n' +
  '| `liability_payable` | Payable |\n' +
  '| `liability_credit_card` | Credit Card |\n' +
  '| `liability_current` | Current Liabilities |\n' +
  '| `liability_non_current` | Non-current Liabilities |\n' +
  '| `equity` | Equity |\n' +
  '| `equity_unaffected` | Current Year Earnings |\n' +
  '| `income` | Income |\n' +
  '| `income_other` | Other Income |\n' +
  '| `expense` | Expenses |\n' +
  '| `expense_depreciation` | Depreciation |\n' +
  '| `expense_direct_cost` | Cost of Revenue |\n' +
  '| `off_balance` | Off-Balance Sheet |\n' +
  '\n' +
  'Filter by type: `[["account_type","=","asset_receivable"]]`\n' +
  'Also available: `account.account.account_type` on move.line via related: `[["account_id.account_type","=","income"]]`\n' +
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
  'search account.move.line -d [["parent_state","=","posted"],["account_id.account_type","in",["income","income_other"]]] -f account_id,credit,debit,balance\n' +
  '```\n' +
  '\n' +
  '### Expense lines\n' +
  '```\n' +
  'search account.move.line -d [["parent_state","=","posted"],["account_id.account_type","in",["expense","expense_direct_cost","expense_depreciation"]]] -f account_id,debit,credit,balance\n' +
  '```\n' +
  '\n' +
  '### Trial balance — receivable accounts\n' +
  '```\n' +
  'search account.move.line -d [["parent_state","=","posted"],["account_id.account_type","=","asset_receivable"]] -f account_id,partner_id,debit,credit,balance,date_maturity,reconciled\n' +
  '```\n' +
  '\n' +
  '### Receivable and payable accounts\n' +
  '```\n' +
  'search account.account -d [["account_type","in",["asset_receivable","liability_payable"]],["deprecated","=",false]] -f code,name,account_type\n' +
  '```\n' +
  '\n' +
  '### Payments\n' +
  '```\n' +
  'search account.payment -d [["state","=","posted"]] -f partner_id,payment_type,amount,date,journal_id,currency_id\n' +
  '```\n' +
  '\n' +
  '### Bank / cash accounts\n' +
  '```\n' +
  'search account.account -d [["account_type","in",["asset_cash","liability_credit_card"]]] -f code,name,account_type\n' +
  '```\n' +
  '\n' +
  '## Visual Analysis\n' +
  '```\n' +
  '// Invoice totals by document type\n' +
  'graph account.move -g move_type -e amount_total -t bar\n' +
  '// Payment state distribution for customer invoices\n' +
  'graph account.move -g payment_state -t pie\n' +
  '// Monthly revenue trend\n' +
  'graph account.move -g invoice_date:month -e amount_untaxed -t line\n' +
  '// Expense breakdown by account type\n' +
  'pivot account.move.line -r account_id -c parent_state -e balance\n' +
  '```\n' +
  '\n' +
  '## Tips\n' +
  '- DO NOT use `user_type_id` in v16+ — it was removed. Use `account_type` directly.\n' +
  '- `account_id.account_type` on `account.move.line` works as a related field for domain filtering.\n' +
  '- `parent_state` on lines avoids a join to `account.move` — prefer it.\n' +
  '- `display_type = product` filters out section/note lines on invoice move.lines.\n' +
  '- `amount_total` is always in company currency; `amount_currency` holds the document currency amount.\n' +
  '- For P&L: sum `balance` on `account.move.line` filtering `account_type IN (income, income_other)` minus `(expense, expense_direct_cost, expense_depreciation)`.\n' +
  '- Bank reconciliation in v16+ uses `account.bank.statement.line` instead of the old `account.bank.statement`.\n';

export default content;
