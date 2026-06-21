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
  '| Model | Purpose |\n' +
  '|---|---|\n' +
  '| `account.invoice` | Customer invoices, vendor bills, credit notes |\n' +
  '| `account.invoice.line` | Line items inside an invoice |\n' +
  '| `account.move` | Raw journal entries (NOT invoices) |\n' +
  '| `account.move.line` | Debit/credit lines of a journal entry |\n' +
  '| `account.account` | Chart of accounts |\n' +
  '| `account.account.type` | Account type master (receivable/payable/…) |\n' +
  '| `account.journal` | Accounting journals |\n' +
  '| `account.payment` | Customer/vendor payments |\n' +
  '| `account.tax` | Tax definitions |\n' +
  '\n' +
  '## Essential Fields — account.invoice\n' +
  '| Field | Values / Notes |\n' +
  '|---|---|\n' +
  '| `type` | `out_invoice` (customer), `in_invoice` (vendor), `out_refund`, `in_refund` |\n' +
  '| `state` | v11: `draft`, `open`, `paid`, `cancel` · v12 adds `in_payment` |\n' +
  '| `date_invoice` | Invoice / bill date |\n' +
  '| `date_due` | Due date |\n' +
  '| `residual` | Remaining unpaid amount (use this, NOT `amount_residual`) |\n' +
  '| `amount_untaxed` | Total before taxes |\n' +
  '| `amount_tax` | Tax amount |\n' +
  '| `amount_total` | Grand total |\n' +
  '| `partner_id` | Customer or vendor |\n' +
  '| `journal_id` | Accounting journal |\n' +
  '| `account_id` | Receivable / payable account |\n' +
  '| `name` | Reference / sequence number |\n' +
  '| `origin` | Source document reference |\n' +
  '\n' +
  '## Essential Fields — account.invoice.line\n' +
  '| Field | Notes |\n' +
  '|---|---|\n' +
  '| `invoice_id` | Parent invoice |\n' +
  '| `product_id` | Product |\n' +
  '| `name` | Description |\n' +
  '| `quantity` | Quantity |\n' +
  '| `price_unit` | Unit price |\n' +
  '| `discount` | Discount % |\n' +
  '| `price_subtotal` | Subtotal (qty × price − discount) |\n' +
  '| `account_id` | Revenue / expense account |\n' +
  '| `invoice_line_tax_ids` | Applied taxes (m2m) |\n' +
  '\n' +
  '## Essential Fields — account.move.line (journal entry lines only)\n' +
  '| Field | Notes |\n' +
  '|---|---|\n' +
  '| `move_id` | Parent journal entry |\n' +
  '| `account_id` | Ledger account |\n' +
  '| `name` | Label |\n' +
  '| `debit` | Debit amount |\n' +
  '| `credit` | Credit amount |\n' +
  '| `balance` | debit − credit |\n' +
  '| `partner_id` | Partner on the line |\n' +
  '| `date_maturity` | Maturity date |\n' +
  '| `reconciled` | Fully reconciled? |\n' +
  '\n' +
  '## Account Classification — account.account\n' +
  '`account.account.user_type_id` is a Many2one to `account.account.type`.\n' +
  '`account.account.type.type` (selection): `receivable`, `payable`, `liquidity`, `other`.\n' +
  'Filter by type: `[["user_type_id.type","=","receivable"]]`\n' +
  '\n' +
  '## Common Query Patterns\n' +
  '\n' +
  '### Customer invoices (open = posted and unpaid)\n' +
  '```\n' +
  'search account.invoice -d [["type","=","out_invoice"],["state","=","open"]] -f name,partner_id,amount_total,residual,date_due\n' +
  '```\n' +
  '\n' +
  '### Vendor bills (all posted states)\n' +
  '```\n' +
  'search account.invoice -d [["type","=","in_invoice"],["state","in",["open","in_payment","paid"]]] -f name,partner_id,amount_total,residual\n' +
  '```\n' +
  '\n' +
  '### Unpaid invoices (aged receivables)\n' +
  '```\n' +
  'search account.invoice -d [["type","=","out_invoice"],["state","=","open"],["date_due","<","2024-01-01"]] -f partner_id,residual,date_due\n' +
  '```\n' +
  '\n' +
  '### All invoice lines for a partner\n' +
  '```\n' +
  'search account.invoice.line -d [["invoice_id.partner_id.name","like","ACME"],["invoice_id.state","!=","cancel"]] -f name,quantity,price_subtotal,account_id\n' +
  '```\n' +
  '\n' +
  '### Receivable accounts\n' +
  '```\n' +
  'search account.account -d [["user_type_id.type","=","receivable"]] -f code,name\n' +
  '```\n' +
  '\n' +
  '### Payments received\n' +
  '```\n' +
  'search account.payment -d [["payment_type","=","inbound"],["state","=","posted"]] -f partner_id,amount,payment_date,journal_id\n' +
  '```\n' +
  '\n' +
  '### Journal entries (direct moves, not invoices)\n' +
  '```\n' +
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
  '- `account.payment` has its own `state` field: `draft`, `posted`, `cancelled`.\n' +
  '- `payment_date` is the payment date field on `account.payment` (renamed in later versions).\n';

export default content;
