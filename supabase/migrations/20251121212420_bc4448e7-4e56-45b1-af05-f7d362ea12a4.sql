-- Step 1: Add a temporary column
ALTER TABLE ledgers ADD COLUMN ledger_type_new TEXT;

-- Step 2: Copy data from old column to new column
UPDATE ledgers SET ledger_type_new = ledger_type::text;

-- Step 3: Drop old column
ALTER TABLE ledgers DROP COLUMN ledger_type;

-- Step 4: Drop and recreate the enum type with all groups
DROP TYPE IF EXISTS ledger_type;

CREATE TYPE ledger_type AS ENUM (
  -- Capital & Liability Groups
  'capital_account',
  'reserves_and_surplus',
  'secured_loans',
  'unsecured_loans',
  'duties_and_taxes',
  'sundry_creditors',
  'suspense_account',
  'current_liabilities',
  'loans_liability',
  'bank_od_account',
  'provisions',
  
  -- Assets Groups
  'fixed_assets',
  'investments',
  'current_assets',
  'sundry_debtors',
  'cash_in_hand',
  'bank_accounts',
  'stock_in_hand',
  'deposits_assets',
  'loans_and_advances_assets',
  
  -- Income Groups
  'sales_accounts',
  'direct_incomes',
  'indirect_incomes',
  
  -- Expense Groups
  'purchase_accounts',
  'direct_expenses',
  'indirect_expenses',
  
  -- Non-Revenue Groups
  'branch_divisions',
  'misc_expenses_asset',
  'profit_and_loss_account'
);

-- Step 5: Rename temporary column to original name and set type
ALTER TABLE ledgers 
  ADD COLUMN ledger_type ledger_type;

UPDATE ledgers 
SET ledger_type = CASE 
  WHEN ledger_type_new = 'customer' THEN 'sundry_debtors'
  WHEN ledger_type_new = 'supplier' THEN 'sundry_creditors'
  WHEN ledger_type_new = 'bank' THEN 'bank_accounts'
  WHEN ledger_type_new = 'cash' THEN 'cash_in_hand'
  WHEN ledger_type_new = 'expense' THEN 'indirect_expenses'
  WHEN ledger_type_new = 'income' THEN 'indirect_incomes'
  WHEN ledger_type_new = 'asset' THEN 'current_assets'
  WHEN ledger_type_new = 'liability' THEN 'current_liabilities'
  WHEN ledger_type_new = 'capital' THEN 'capital_account'
  ELSE 'sundry_debtors'::ledger_type
END::ledger_type;

-- Step 6: Make ledger_type NOT NULL
ALTER TABLE ledgers ALTER COLUMN ledger_type SET NOT NULL;

-- Step 7: Drop temporary column
ALTER TABLE ledgers DROP COLUMN ledger_type_new;