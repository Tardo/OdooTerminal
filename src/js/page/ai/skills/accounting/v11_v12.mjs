// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const content: string =
  '# SKILL: Odoo Accounting Analysis — v11 / v12\n' +
  '\n' +
  '## Model Architecture\n' +
  'In Odoo 11–12 invoices live in `account.invoice` (NOT in `account.move`).\n' +
  '`account.move` / `account.move.line` exist only for raw journal entries.\n' +
  '\n' +
  '## Key Models\n' +
  '- `account.invoice` / `account.invoice.line` — customer invoices, vendor bills, credit notes (+ lines)\n' +
  '- `account.move` / `account.move.line` — raw journal entries (NOT invoices) and their debit/credit lines\n' +
  '- `account.account` — chart of accounts · `account.account.type` — account type master\n' +
  '- `account.journal` — journals · `account.payment` — payments · `account.tax` — taxes\n' +
  '\n' +
  '## Essential Fields — account.invoice\n' +
  '- `type`: out_invoice (customer) | in_invoice (vendor) | out_refund | in_refund\n' +
  '- `state`: v11: draft | open | paid | cancel · v12 adds in_payment\n' +
  '- `date_invoice` (invoice date) · `date_due` (due date)\n' +
  '- `residual` — remaining unpaid amount (use this, NOT `amount_residual`)\n' +
  '- `amount_untaxed` · `amount_tax` · `amount_total`\n' +
  '- `partner_id` · `journal_id` · `account_id` (receivable/payable account) · `name` (sequence) · `origin` (source doc)\n' +
  '\n' +
  '## Essential Fields — account.invoice.line\n' +
  '- `invoice_id` (parent) · `product_id` · `name` (description) · `quantity` · `price_unit` · `discount` (%)\n' +
  '- `price_subtotal` (qty × price − discount) · `account_id` (revenue/expense account) · `invoice_line_tax_ids` (m2m)\n' +
  '\n' +
  '## Essential Fields — account.move.line (journal entry lines only)\n' +
  '- `move_id` (parent) · `account_id` · `name` (label) · `debit` · `credit` · `balance` (debit − credit)\n' +
  '- `partner_id` · `date_maturity` · `reconciled`\n' +
  '\n' +
  '## Account Classification — account.account\n' +
  '`account.account.user_type_id` is a Many2one to `account.account.type`.\n' +
  '`account.account.type.type` (selection): `receivable`, `payable`, `liquidity`, `other`.\n' +
  'Filter by type: `[["user_type_id.type","=","receivable"]]`\n' +
  '\n' +
  '## Common Query Patterns\n' +
  '```\n' +
  '// Customer invoices (open = posted and unpaid)\n' +
  'search account.invoice -d [["type","=","out_invoice"],["state","=","open"]] -f name,partner_id,amount_total,residual,date_due\n' +
  '// Vendor bills (all posted states)\n' +
  'search account.invoice -d [["type","=","in_invoice"],["state","in",["open","in_payment","paid"]]] -f name,partner_id,amount_total,residual\n' +
  '// Unpaid invoices (aged receivables)\n' +
  'search account.invoice -d [["type","=","out_invoice"],["state","=","open"],["date_due","<","2024-01-01"]] -f partner_id,residual,date_due\n' +
  '// All invoice lines for a partner\n' +
  'search account.invoice.line -d [["invoice_id.partner_id.name","like","ACME"],["invoice_id.state","!=","cancel"]] -f name,quantity,price_subtotal,account_id\n' +
  '// Receivable accounts\n' +
  'search account.account -d [["user_type_id.type","=","receivable"]] -f code,name\n' +
  '// Payments received\n' +
  'search account.payment -d [["payment_type","=","inbound"],["state","=","posted"]] -f partner_id,amount,payment_date,journal_id\n' +
  '// Journal entries (direct moves, not invoices)\n' +
  'search account.move -d [["state","=","posted"]] -f name,date,journal_id,ref\n' +
  '```\n' +
  '\n' +
  '## Visual Analysis\n' +
  '```\n' +
  '// Invoice totals by type\n' +
  'graph account.invoice -g type -e amount_total -t bar\n' +
  '// Invoice state breakdown\n' +
  'graph account.invoice -g state -t pie\n' +
  '```\n' +
  '\n' +
  '## Tips\n' +
  '- "Unpaid" = `state = open` (or `in_payment` on v12). There is NO `payment_state` field in v11–v12.\n' +
  '- `residual` is the amount still owed; it reaches 0 when fully paid.\n' +
  '- Do NOT use `account.move` for invoice queries — that model holds only raw journal entries in this version.\n' +
  '- `account.payment` has its own `state`: `draft`, `posted`, `cancelled`; its date field is `payment_date` (renamed in later versions).\n';

export default content;
