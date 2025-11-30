-- Add size and measurement fields to sales_orders table
ALTER TABLE sales_orders
ADD COLUMN size TEXT,
ADD COLUMN width_inch NUMERIC,
ADD COLUMN thickness_inch NUMERIC,
ADD COLUMN length_feet NUMERIC,
ADD COLUMN cft NUMERIC,
ADD COLUMN ready_materials NUMERIC DEFAULT 0;