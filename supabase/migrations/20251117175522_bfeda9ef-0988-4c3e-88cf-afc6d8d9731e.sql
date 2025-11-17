-- Create enum types for voucher types
CREATE TYPE voucher_type AS ENUM (
  'sales',
  'purchase', 
  'payment',
  'receipt',
  'journal',
  'contra',
  'debit_note',
  'credit_note',
  'stock_journal'
);

CREATE TYPE notification_status AS ENUM ('pending', 'accepted', 'rejected', 'reviewed');
CREATE TYPE ledger_type AS ENUM ('customer', 'supplier', 'bank', 'cash', 'expense', 'income', 'asset', 'liability', 'capital');

-- Profiles table for user information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  company_name TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Companies/Organizations table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gstin TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  financial_year_start DATE DEFAULT '2024-04-01',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Ledgers (Parties, Accounts)
CREATE TABLE ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ledger_type ledger_type NOT NULL,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  gstin TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Vouchers (Transaction headers)
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  voucher_type voucher_type NOT NULL,
  voucher_number TEXT NOT NULL,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_ledger_id UUID REFERENCES ledgers(id),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  narration TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, voucher_type, voucher_number)
);

-- Voucher entries (line items/journal entries)
CREATE TABLE voucher_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  ledger_id UUID NOT NULL REFERENCES ledgers(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  narration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications for inter-party transactions
CREATE TABLE voucher_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  from_company_id UUID NOT NULL REFERENCES companies(id),
  to_user_email TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for companies
CREATE POLICY "Users can view own companies"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ledgers
CREATE POLICY "Users can view ledgers of own companies"
  ON ledgers FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert ledgers in own companies"
  ON ledgers FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update ledgers in own companies"
  ON ledgers FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete ledgers in own companies"
  ON ledgers FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS Policies for vouchers
CREATE POLICY "Users can view vouchers of own companies"
  ON vouchers FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert vouchers in own companies"
  ON vouchers FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update vouchers in own companies"
  ON vouchers FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete vouchers in own companies"
  ON vouchers FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- RLS Policies for voucher_entries
CREATE POLICY "Users can view entries of own vouchers"
  ON voucher_entries FOR SELECT
  USING (voucher_id IN (
    SELECT v.id FROM vouchers v
    JOIN companies c ON v.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert entries in own vouchers"
  ON voucher_entries FOR INSERT
  WITH CHECK (voucher_id IN (
    SELECT v.id FROM vouchers v
    JOIN companies c ON v.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can update entries in own vouchers"
  ON voucher_entries FOR UPDATE
  USING (voucher_id IN (
    SELECT v.id FROM vouchers v
    JOIN companies c ON v.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete entries in own vouchers"
  ON voucher_entries FOR DELETE
  USING (voucher_id IN (
    SELECT v.id FROM vouchers v
    JOIN companies c ON v.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

-- RLS Policies for notifications
CREATE POLICY "Users can view notifications sent to them"
  ON voucher_notifications FOR SELECT
  USING (
    to_user_email IN (SELECT email FROM profiles WHERE id = auth.uid())
    OR from_company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert notifications from own companies"
  ON voucher_notifications FOR INSERT
  WITH CHECK (from_company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update notifications sent to them"
  ON voucher_notifications FOR UPDATE
  USING (to_user_email IN (SELECT email FROM profiles WHERE id = auth.uid()));

-- Triggers for auto-creating profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ledgers_updated_at BEFORE UPDATE ON ledgers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();