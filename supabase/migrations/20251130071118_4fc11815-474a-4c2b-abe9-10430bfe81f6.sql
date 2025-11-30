-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'production', 'dispatch', 'supervisor');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'in_production', 'partially_dispatched', 'completed');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create machines table
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  machine_code TEXT UNIQUE NOT NULL,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sales_orders table
CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  product TEXT NOT NULL,
  ordered_quantity NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  priority INTEGER DEFAULT 0,
  status order_status DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order_assignments table
CREATE TABLE public.order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (order_id, assigned_to)
);

-- Create production_entries table
CREATE TABLE public.production_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  produced_quantity NUMERIC NOT NULL,
  machine_id UUID REFERENCES public.machines(id),
  shift TEXT,
  wastage NUMERIC DEFAULT 0,
  remarks TEXT,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  edited_reason TEXT,
  previous_quantity NUMERIC
);

-- Create dispatch_entries table
CREATE TABLE public.dispatch_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  dispatched_quantity NUMERIC NOT NULL,
  vehicle_no TEXT,
  transporter TEXT,
  driver_name TEXT,
  dispatch_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  loading_remarks TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for machines
CREATE POLICY "All authenticated users can view machines"
  ON public.machines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners and supervisors can manage machines"
  ON public.machines FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for sales_orders
CREATE POLICY "Users can view assigned orders"
  ON public.sales_orders FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner') 
    OR public.has_role(auth.uid(), 'supervisor')
    OR id IN (
      SELECT order_id FROM public.order_assignments 
      WHERE assigned_to = auth.uid()
    )
  );

CREATE POLICY "Owners and supervisors can manage orders"
  ON public.sales_orders FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for order_assignments
CREATE POLICY "Users can view assignments"
  ON public.order_assignments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'supervisor')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Owners and supervisors can manage assignments"
  ON public.order_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for production_entries
CREATE POLICY "Users can view production entries for their orders"
  ON public.production_entries FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'supervisor')
    OR order_id IN (
      SELECT order_id FROM public.order_assignments 
      WHERE assigned_to = auth.uid()
    )
  );

CREATE POLICY "Production team can add entries"
  ON public.production_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'supervisor'))
    AND order_id IN (
      SELECT order_id FROM public.order_assignments 
      WHERE assigned_to = auth.uid()
    )
  );

CREATE POLICY "Production team can update own entries"
  ON public.production_entries FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'supervisor'));

-- RLS Policies for dispatch_entries
CREATE POLICY "Users can view dispatch entries"
  ON public.dispatch_entries FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'dispatch')
  );

CREATE POLICY "Dispatch team can add entries"
  ON public.dispatch_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'dispatch') 
    OR public.has_role(auth.uid(), 'owner') 
    OR public.has_role(auth.uid(), 'supervisor')
  );

-- Create function to update order status based on production and dispatch
CREATE OR REPLACE FUNCTION public.update_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ordered_qty NUMERIC;
  v_total_dispatch NUMERIC;
  v_total_production NUMERIC;
BEGIN
  -- Get order details
  SELECT ordered_quantity INTO v_ordered_qty
  FROM sales_orders
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  -- Get total dispatch
  SELECT COALESCE(SUM(dispatched_quantity), 0) INTO v_total_dispatch
  FROM dispatch_entries
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

  -- Get total production
  SELECT COALESCE(SUM(produced_quantity), 0) INTO v_total_production
  FROM production_entries
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

  -- Update order status
  UPDATE sales_orders
  SET 
    status = CASE
      WHEN v_total_dispatch >= v_ordered_qty THEN 'completed'::order_status
      WHEN v_total_dispatch > 0 THEN 'partially_dispatched'::order_status
      WHEN v_total_production > 0 THEN 'in_production'::order_status
      ELSE 'pending'::order_status
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN NEW;
END;
$$;

-- Create triggers to auto-update order status
CREATE TRIGGER update_order_status_on_production
  AFTER INSERT OR UPDATE OR DELETE ON public.production_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_status();

CREATE TRIGGER update_order_status_on_dispatch
  AFTER INSERT OR UPDATE OR DELETE ON public.dispatch_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_status();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.production_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();