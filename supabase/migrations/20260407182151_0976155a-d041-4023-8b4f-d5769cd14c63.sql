
-- Payment methods reference table
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read payment_methods" ON public.payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage payment_methods" ON public.payment_methods FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin update payment_methods" ON public.payment_methods FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin delete payment_methods" ON public.payment_methods FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

-- Seed payment methods
INSERT INTO public.payment_methods (name, position) VALUES
  ('Efectivo', 0),
  ('Tarjeta', 1),
  ('Transferencia', 2),
  ('Bizum', 3),
  ('Otros', 4);

-- Invoice series per center
CREATE TABLE public.invoice_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id),
  prefix text NOT NULL,
  doc_type text NOT NULL DEFAULT 'factura', -- factura | simplificada
  current_number integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(center_id, prefix)
);
ALTER TABLE public.invoice_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read invoice_series" ON public.invoice_series FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage invoice_series" ON public.invoice_series FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin update invoice_series" ON public.invoice_series FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin delete invoice_series" ON public.invoice_series FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

-- Quotes
CREATE TYPE public.quote_status AS ENUM ('borrador','entregado','aceptado','rechazado');

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  center_id uuid NOT NULL REFERENCES public.centers(id),
  business_id uuid REFERENCES public.businesses(id),
  quote_number text,
  status public.quote_status NOT NULL DEFAULT 'borrador',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  fiscal_name text,
  fiscal_nif text,
  fiscal_address text,
  fiscal_email text,
  fiscal_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read quotes" ON public.quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff update quotes" ON public.quotes FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Admin delete quotes" ON public.quotes FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 21,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  service_id uuid REFERENCES public.services(id),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read quote_items" ON public.quote_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage quote_items" ON public.quote_items FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff update quote_items" ON public.quote_items FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff delete quote_items" ON public.quote_items FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));

-- Invoices
CREATE TYPE public.invoice_status AS ENUM ('borrador','emitida','parcialmente_cobrada','cobrada','anulada');
CREATE TYPE public.invoice_type AS ENUM ('factura','simplificada');

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  center_id uuid NOT NULL REFERENCES public.centers(id),
  business_id uuid REFERENCES public.businesses(id),
  quote_id uuid REFERENCES public.quotes(id),
  series_id uuid REFERENCES public.invoice_series(id),
  invoice_number text,
  invoice_type public.invoice_type NOT NULL DEFAULT 'factura',
  status public.invoice_status NOT NULL DEFAULT 'borrador',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  notes text,
  fiscal_name text,
  fiscal_nif text,
  fiscal_address text,
  fiscal_email text,
  fiscal_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff update invoices" ON public.invoices FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Admin delete invoices" ON public.invoices FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 21,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  service_id uuid REFERENCES public.services(id),
  appointment_id uuid REFERENCES public.appointments(id),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read invoice_items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage invoice_items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff update invoice_items" ON public.invoice_items FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff delete invoice_items" ON public.invoice_items FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  payment_method_id uuid REFERENCES public.payment_methods(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff update payments" ON public.payments FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Admin delete payments" ON public.payments FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

-- Triggers for updated_at
CREATE TRIGGER update_invoice_series_updated_at BEFORE UPDATE ON public.invoice_series FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
