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
  '- `account.move` — journal entries AND invoices / bills / credit notes\n' +
  '- `account.move.line` — all debit/credit lines\n' +
  '- `account.account` — chart of accounts · `account.journal` — journals · `account.payment` — payments · `account.tax` — taxes\n' +
  '- `account.bank.statement.line` — bank statement lines (v16+ used for reconciliation, replacing `account.bank.statement`)\n' +
  '\n' +
  '## Essential Fields — account.move\n' +
  '- `move_type`: entry (journal entry) | out_invoice | in_invoice | out_refund | in_refund | out_receipt | in_receipt\n' +
  '- `state`: draft | posted | cancel\n' +
  '- `payment_state`: not_paid | in_payment | paid | partial | reversed | invoicing_legacy\n' +
  '- `invoice_date` · `invoice_date_due` · `date` (accounting date)\n' +
  '- `amount_untaxed` · `amount_tax` · `amount_total` (company currency) · `amount_residual` (remaining unpaid) · `amount_untaxed_signed` (negative for outbound)\n' +
  '- `partner_id` · `journal_id` · `currency_id` (document currency) · `name` (sequence) · `ref` (external reference) · `narration` (notes, HTML)\n' +
  '\n' +
  '## Essential Fields — account.move.line\n' +
  '- `move_id` (parent) · `account_id` · `name` (label) · `debit` · `credit` · `balance` (debit − credit) · `amount_currency`\n' +
  '- `partner_id` · `date_maturity` · `reconciled` · `full_reconcile_id` · `tax_ids` · `quantity` / `price_unit` (product lines)\n' +
  '- `parent_state` — mirrors `account.move.state`; filter posted lines without a join\n' +
  '- `display_type`: product | line_section | line_note — filter to `product` for real lines\n' +
  '\n' +
  '## Account Classification — account.account (v16+)\n' +
  '`user_type_id` is GONE. Use `account_type` (Selection, stored + computed):\n' +
  '- Assets: `asset_receivable`, `asset_cash` (bank and cash), `asset_current`, `asset_non_current`, `asset_prepayments`, `asset_fixed`\n' +
  '- Liabilities: `liability_payable`, `liability_credit_card`, `liability_current`, `liability_non_current`\n' +
  '- Equity: `equity`, `equity_unaffected` (current year earnings)\n' +
  '- P&L: `income`, `income_other`, `expense`, `expense_depreciation`, `expense_direct_cost` (cost of revenue)\n' +
  '- Other: `off_balance`\n' +
  'Filter by type: `[["account_type","=","asset_receivable"]]` — also as related on move lines: `[["account_id.account_type","=","income"]]`\n' +
  '\n' +
  '## Common Query Patterns\n' +
  '```\n' +
  '// Customer invoices (posted)\n' +
  'search account.move -d [["move_type","=","out_invoice"],["state","=","posted"]] -f name,partner_id,amount_total,payment_state,invoice_date_due\n' +
  '// Unpaid vendor bills\n' +
  'search account.move -d [["move_type","=","in_invoice"],["state","=","posted"],["payment_state","!=","paid"]] -f name,partner_id,amount_residual,invoice_date_due\n' +
  '// Partially paid invoices\n' +
  'search account.move -d [["move_type","=","out_invoice"],["state","=","posted"],["payment_state","=","partial"]] -f partner_id,amount_total,amount_residual\n' +
  '// Overdue receivables\n' +
  'search account.move -d [["move_type","=","out_invoice"],["state","=","posted"],["payment_state","not in",["paid","reversed"]],["invoice_date_due","<","2024-01-01"]] -f partner_id,amount_residual,invoice_date_due\n' +
  '// Income / revenue lines (P&L)\n' +
  'search account.move.line -d [["parent_state","=","posted"],["account_id.account_type","in",["income","income_other"]]] -f account_id,credit,debit,balance\n' +
  '// Expense lines\n' +
  'search account.move.line -d [["parent_state","=","posted"],["account_id.account_type","in",["expense","expense_direct_cost","expense_depreciation"]]] -f account_id,debit,credit,balance\n' +
  '// Trial balance — receivable accounts\n' +
  'search account.move.line -d [["parent_state","=","posted"],["account_id.account_type","=","asset_receivable"]] -f account_id,partner_id,debit,credit,balance,date_maturity,reconciled\n' +
  '// Receivable and payable accounts\n' +
  'search account.account -d [["account_type","in",["asset_receivable","liability_payable"]],["deprecated","=",false]] -f code,name,account_type\n' +
  '// Bank / cash accounts\n' +
  'search account.account -d [["account_type","in",["asset_cash","liability_credit_card"]]] -f code,name,account_type\n' +
  '// Payments\n' +
  'search account.payment -d [["state","=","posted"]] -f partner_id,payment_type,amount,date,journal_id,currency_id\n' +
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
  '- `parent_state` on lines avoids a join to `account.move` — prefer it.\n' +
  '- `display_type = product` filters out section/note lines on invoice move.lines.\n' +
  '- `amount_total` is always in company currency; `amount_currency` holds the document currency amount.\n' +
  '- For P&L: sum `balance` on `account.move.line` filtering `account_type IN (income, income_other)` minus `(expense, expense_direct_cost, expense_depreciation)`.\n' +
  '- Bank reconciliation in v16+ uses `account.bank.statement.line` instead of the old `account.bank.statement`.\n';

export default content;
