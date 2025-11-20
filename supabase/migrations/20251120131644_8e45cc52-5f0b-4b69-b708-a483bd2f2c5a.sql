-- Phase 1: Expand ledger types for complete accounting structure
-- Drop and recreate ledger_type enum with all Tally groups
ALTER TYPE ledger_type RENAME TO ledger_type_old;

CREATE TYPE ledger_type AS ENUM (
  -- Capital & Liabilities
  'capital_account',
  'reserves_and_surplus',
  'secured_loans',
  'unsecured_loans',
  'duties_and_taxes',
  'sundry_creditors',
  
  -- Assets
  'fixed_assets',
  'investments',
  'current_assets',
  'sundry_debtors',
  'cash_in_hand',
  'bank_accounts',
  'stock_in_hand',
  'deposits_assets',
  'loans_and_advances_assets',
  
  -- Income
  'sales_accounts',
  'direct_incomes',
  'indirect_incomes',
  
  -- Expenses
  'purchase_accounts',
  'direct_expenses',
  'indirect_expenses',
  
  -- Other
  'suspense_account',
  'branch_divisions'
);

-- Migrate existing data
ALTER TABLE ledgers ALTER COLUMN ledger_type TYPE ledger_type USING 
  CASE ledger_type::text
    WHEN 'customer' THEN 'sundry_debtors'::ledger_type
    WHEN 'supplier' THEN 'sundry_creditors'::ledger_type
    WHEN 'bank' THEN 'bank_accounts'::ledger_type
    WHEN 'cash' THEN 'cash_in_hand'::ledger_type
    WHEN 'expense' THEN 'indirect_expenses'::ledger_type
    WHEN 'income' THEN 'indirect_incomes'::ledger_type
    WHEN 'asset' THEN 'current_assets'::ledger_type
    WHEN 'liability' THEN 'sundry_creditors'::ledger_type
    ELSE 'suspense_account'::ledger_type
  END;

DROP TYPE ledger_type_old;

-- Phase 2: Add GST fields to companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS pan VARCHAR(10),
ADD COLUMN IF NOT EXISTS gstin_state_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS enable_gst BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gst_registration_type VARCHAR(50) DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20);

-- Add GST fields to ledgers
ALTER TABLE ledgers
ADD COLUMN IF NOT EXISTS pan VARCHAR(10),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS gstin_state_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS enable_gst BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_type VARCHAR(50);

-- Phase 2: Create GST rates table
CREATE TABLE IF NOT EXISTS gst_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  cgst_rate NUMERIC(5,2) DEFAULT 0,
  sgst_rate NUMERIC(5,2) DEFAULT 0,
  igst_rate NUMERIC(5,2) DEFAULT 0,
  cess_rate NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gst_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage GST rates in own companies"
ON gst_rates FOR ALL
USING (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));

-- Phase 3: Create inventory tables
-- Stock Groups
CREATE TABLE IF NOT EXISTS stock_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  parent_group_id UUID REFERENCES stock_groups(id),
  under_group VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

ALTER TABLE stock_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage stock groups in own companies"
ON stock_groups FOR ALL
USING (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));

-- Godowns (Warehouses)
CREATE TABLE IF NOT EXISTS godowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

ALTER TABLE godowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage godowns in own companies"
ON godowns FOR ALL
USING (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));

-- Stock Items
CREATE TABLE IF NOT EXISTS stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stock_group_id UUID REFERENCES stock_groups(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  unit VARCHAR(50) DEFAULT 'Nos',
  opening_balance NUMERIC(15,2) DEFAULT 0,
  opening_value NUMERIC(15,2) DEFAULT 0,
  opening_rate NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  current_value NUMERIC(15,2) DEFAULT 0,
  reorder_level NUMERIC(15,2) DEFAULT 0,
  hsn_code VARCHAR(20),
  gst_rate_id UUID REFERENCES gst_rates(id),
  godown_id UUID REFERENCES godowns(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage stock items in own companies"
ON stock_items FOR ALL
USING (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));

-- Phase 4: Expand voucher types
ALTER TYPE voucher_type RENAME TO voucher_type_old;

CREATE TYPE voucher_type AS ENUM (
  'sales',
  'purchase',
  'payment',
  'receipt',
  'journal',
  'contra',
  'debit_note',
  'credit_note',
  'stock_journal',
  'physical_stock'
);

ALTER TABLE vouchers ALTER COLUMN voucher_type TYPE voucher_type USING voucher_type::text::voucher_type;
DROP TYPE voucher_type_old;

-- Add stock-related fields to vouchers
ALTER TABLE vouchers
ADD COLUMN IF NOT EXISTS godown_id UUID REFERENCES godowns(id),
ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS reference_date DATE;

-- Add GST and stock fields to voucher_entries
ALTER TABLE voucher_entries
ADD COLUMN IF NOT EXISTS stock_item_id UUID REFERENCES stock_items(id),
ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rate NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cess_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cess_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS godown_id UUID REFERENCES godowns(id);

-- Phase 5: Create cost centers table
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cost centers in own companies"
ON cost_centers FOR ALL
USING (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));

-- Add cost center to voucher entries
ALTER TABLE voucher_entries
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
  financial_year VARCHAR(20) NOT NULL,
  period VARCHAR(20) NOT NULL,
  budgeted_amount NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, ledger_id, financial_year, period)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budgets in own companies"
ON budgets FOR ALL
USING (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));

-- Create bank reconciliation table
CREATE TABLE IF NOT EXISTS bank_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_ledger_id UUID NOT NULL REFERENCES ledgers(id),
  voucher_id UUID REFERENCES vouchers(id),
  transaction_date DATE NOT NULL,
  cheque_number VARCHAR(50),
  amount NUMERIC(15,2) NOT NULL,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_date DATE,
  bank_statement_date DATE,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage bank reconciliation in own companies"
ON bank_reconciliation FOR ALL
USING (company_id IN (
  SELECT id FROM companies WHERE user_id = auth.uid()
));

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gst_rates_updated_at BEFORE UPDATE ON gst_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_groups_updated_at BEFORE UPDATE ON stock_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_godowns_updated_at BEFORE UPDATE ON godowns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON cost_centers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_reconciliation_updated_at BEFORE UPDATE ON bank_reconciliation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();