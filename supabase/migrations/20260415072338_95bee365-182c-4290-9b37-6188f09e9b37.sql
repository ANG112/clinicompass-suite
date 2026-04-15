
-- Campaign status enum
CREATE TYPE public.campaign_status AS ENUM ('planificada', 'activa', 'finalizada', 'cancelada');

-- Campaign contact status enum
CREATE TYPE public.campaign_contact_status AS ENUM ('pendiente', 'contactado', 'interesado', 'convertido', 'descartado');

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  business_line public.business_line NOT NULL,
  center_id UUID REFERENCES public.centers(id),
  status public.campaign_status NOT NULL DEFAULT 'planificada',
  target_count INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read campaigns" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage campaigns" ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff update campaigns" ON public.campaigns FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Admin delete campaigns" ON public.campaigns FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign contacts junction table
CREATE TABLE public.campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status public.campaign_contact_status NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, contact_id)
);

ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read campaign_contacts" ON public.campaign_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage campaign_contacts" ON public.campaign_contacts FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff update campaign_contacts" ON public.campaign_contacts FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));
CREATE POLICY "Staff delete campaign_contacts" ON public.campaign_contacts FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial']::app_role[]));

CREATE TRIGGER update_campaign_contacts_updated_at BEFORE UPDATE ON public.campaign_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
