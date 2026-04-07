
-- =============================================
-- PHASE 1: CONTACT CATEGORIES + CONTACTS
-- =============================================

-- Contact categories (extensible)
CREATE TABLE public.contact_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read contact_categories" ON public.contact_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage contact_categories" ON public.contact_categories FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin update contact_categories" ON public.contact_categories FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin delete contact_categories" ON public.contact_categories FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

INSERT INTO public.contact_categories (name, label, position) VALUES
  ('lead', 'Lead', 0),
  ('cliente', 'Cliente', 1),
  ('cliente_recurrente', 'Cliente Recurrente', 2);

-- Contacts table (unified)
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.contact_categories(id),
  first_name text NOT NULL,
  last_name text,
  nif text,
  birth_date date,
  sex text,
  phone text,
  email text,
  address text,
  city text,
  postal_code text,
  company_name text,
  center_id uuid REFERENCES public.centers(id),
  assigned_professional_id uuid REFERENCES public.staff_profiles(id),
  source text,
  tags text[] DEFAULT '{}',
  notes text,
  fiscal_name text,
  fiscal_nif text,
  fiscal_address text,
  fiscal_email text,
  fiscal_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_contacts_category ON public.contacts(category_id);
CREATE INDEX idx_contacts_center ON public.contacts(center_id);
CREATE INDEX idx_contacts_deleted ON public.contacts(deleted_at);

CREATE POLICY "Authenticated read contacts" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));
CREATE POLICY "Staff update contacts" ON public.contacts FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));
CREATE POLICY "Admin delete contacts" ON public.contacts FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate patients -> contacts (category=cliente)
INSERT INTO public.contacts (id, category_id, first_name, last_name, nif, birth_date, sex, phone, email, address, city, postal_code, center_id, assigned_professional_id, source, tags, notes, fiscal_name, fiscal_nif, fiscal_address, fiscal_email, fiscal_phone, created_at, updated_at, deleted_at)
SELECT p.id, (SELECT id FROM public.contact_categories WHERE name='cliente'),
  p.first_name, p.last_name, p.nif, p.birth_date, p.sex, p.phone, p.email, p.address, p.city, p.postal_code, p.center_id, p.assigned_professional_id, p.source, p.tags, p.notes, p.fiscal_name, p.fiscal_nif, p.fiscal_address, p.fiscal_email, p.fiscal_phone, p.created_at, p.updated_at, p.deleted_at
FROM public.patients p;

-- Migrate non-converted leads -> contacts (category=lead)
INSERT INTO public.contacts (id, category_id, first_name, last_name, phone, email, company_name, center_id, source, notes, created_at, updated_at, deleted_at)
SELECT l.id, (SELECT id FROM public.contact_categories WHERE name='lead'),
  l.first_name, l.last_name, l.phone, l.email, l.company_name, l.center_id, l.source, l.notes, l.created_at, l.updated_at, l.deleted_at
FROM public.leads l WHERE l.converted = false;

-- Add contact_id to referencing tables
ALTER TABLE public.appointments ADD COLUMN contact_id uuid REFERENCES public.contacts(id);
ALTER TABLE public.documents ADD COLUMN contact_id uuid REFERENCES public.contacts(id);
ALTER TABLE public.interactions ADD COLUMN contact_id uuid REFERENCES public.contacts(id);
ALTER TABLE public.treatment_packs ADD COLUMN contact_id uuid REFERENCES public.contacts(id);

-- Populate contact_id from patient_id
UPDATE public.appointments SET contact_id = patient_id WHERE patient_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contacts WHERE id = patient_id);
UPDATE public.documents SET contact_id = patient_id WHERE patient_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contacts WHERE id = patient_id);
UPDATE public.interactions SET contact_id = COALESCE(
  CASE WHEN patient_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contacts WHERE id = patient_id) THEN patient_id END,
  CASE WHEN lead_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contacts WHERE id = lead_id) THEN lead_id END
);
UPDATE public.treatment_packs SET contact_id = patient_id WHERE patient_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contacts WHERE id = patient_id);

-- =============================================
-- PHASE 2: BUSINESS TYPES + BUSINESSES
-- =============================================

-- Business types
CREATE TABLE public.business_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  business_line text NOT NULL,
  default_price numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read business_types" ON public.business_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage business_types" ON public.business_types FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin update business_types" ON public.business_types FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin delete business_types" ON public.business_types FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

INSERT INTO public.business_types (name, business_line, default_price, position) VALUES
  ('Fisioterapia sesión suelta', 'fisioterapia', 50, 0),
  ('Fisioterapia bono', 'fisioterapia', 200, 1),
  ('Fisioterapia primera revisión', 'fisioterapia', 0, 2),
  ('Nutrición primera consulta', 'nutricion', 45, 3),
  ('Nutrición seguimiento', 'nutricion', 35, 4),
  ('Psicotécnico carnet', 'psicotecnicos', 35, 5),
  ('Psicotécnico armas', 'psicotecnicos', 40, 6),
  ('Otros', 'otros', 0, 7);

-- Pipeline stages per business type
CREATE TABLE public.business_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type_id uuid NOT NULL REFERENCES public.business_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read business_pipeline_stages" ON public.business_pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage business_pipeline_stages" ON public.business_pipeline_stages FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin update business_pipeline_stages" ON public.business_pipeline_stages FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin delete business_pipeline_stages" ON public.business_pipeline_stages FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

-- Seed default stages for each business type
INSERT INTO public.business_pipeline_stages (business_type_id, name, position)
SELECT bt.id, s.name, s.pos
FROM public.business_types bt
CROSS JOIN (VALUES ('Nuevo',0),('Contactado',1),('Propuesta',2),('Negociación',3),('Ganado',4),('Perdido',5)) AS s(name, pos);

-- Businesses (opportunities)
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  center_id uuid REFERENCES public.centers(id),
  business_type_id uuid NOT NULL REFERENCES public.business_types(id),
  stage_id uuid REFERENCES public.business_pipeline_stages(id),
  assigned_to uuid REFERENCES public.staff_profiles(id),
  name text NOT NULL,
  estimated_amount numeric NOT NULL DEFAULT 0,
  expected_close_date date,
  status text NOT NULL DEFAULT 'abierto',
  next_action text,
  next_action_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_businesses_contact ON public.businesses(contact_id);
CREATE INDEX idx_businesses_type ON public.businesses(business_type_id);
CREATE INDEX idx_businesses_stage ON public.businesses(stage_id);
CREATE INDEX idx_businesses_status ON public.businesses(status);

CREATE POLICY "Authenticated read businesses" ON public.businesses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage businesses" ON public.businesses FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff update businesses" ON public.businesses FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Admin delete businesses" ON public.businesses FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Business stage history (audit trail)
CREATE TABLE public.business_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_stage_id uuid REFERENCES public.business_pipeline_stages(id),
  to_stage_id uuid NOT NULL REFERENCES public.business_pipeline_stages(id),
  changed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read business_stage_history" ON public.business_stage_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create business_stage_history" ON public.business_stage_history FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));

-- Add business_id to interactions for linking interactions to specific deals
ALTER TABLE public.interactions ADD COLUMN business_id uuid REFERENCES public.businesses(id);
