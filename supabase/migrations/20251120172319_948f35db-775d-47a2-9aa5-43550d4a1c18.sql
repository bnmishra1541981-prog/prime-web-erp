-- Add new invoice fields to vouchers table
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50),
ADD COLUMN IF NOT EXISTS transport_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS transport_gst VARCHAR(15),
ADD COLUMN IF NOT EXISTS truck_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS lr_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS delivery_place VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS tcs_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tcs_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS round_off NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_charges NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS basic_amount NUMERIC(15,2) DEFAULT 0;

COMMENT ON COLUMN public.vouchers.payment_terms IS 'Payment condition in days';
COMMENT ON COLUMN public.vouchers.payment_mode IS 'Mode of payment (Cash, Cheque, NEFT, etc)';
COMMENT ON COLUMN public.vouchers.transport_name IS 'Transport company name';
COMMENT ON COLUMN public.vouchers.transport_gst IS 'Transport company GST number';
COMMENT ON COLUMN public.vouchers.truck_number IS 'Truck/Vehicle number for dispatch';
COMMENT ON COLUMN public.vouchers.lr_number IS 'LR (Lorry Receipt) number';
COMMENT ON COLUMN public.vouchers.delivery_place IS 'Place of delivery';
COMMENT ON COLUMN public.vouchers.billing_address IS 'Bill To address';
COMMENT ON COLUMN public.vouchers.tcs_rate IS 'TCS rate percentage';
COMMENT ON COLUMN public.vouchers.tcs_amount IS 'TCS amount';
COMMENT ON COLUMN public.vouchers.tds_rate IS 'TDS rate percentage';
COMMENT ON COLUMN public.vouchers.tds_amount IS 'TDS amount';
COMMENT ON COLUMN public.vouchers.round_off IS 'Round off amount';
COMMENT ON COLUMN public.vouchers.other_charges IS 'Other charges';
COMMENT ON COLUMN public.vouchers.basic_amount IS 'Basic amount before taxes';