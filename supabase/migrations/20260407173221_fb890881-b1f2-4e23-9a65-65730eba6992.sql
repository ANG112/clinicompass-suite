
-- Create availability slot status enum
CREATE TYPE public.slot_status AS ENUM ('disponible', 'ocupado', 'bloqueado');

-- Create availability_slots table
CREATE TABLE public.availability_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  professional_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  service_id UUID REFERENCES public.services(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status public.slot_status NOT NULL DEFAULT 'disponible',
  appointment_id UUID REFERENCES public.appointments(id),
  notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_availability_slots_date ON public.availability_slots(date);
CREATE INDEX idx_availability_slots_professional ON public.availability_slots(professional_id, date);
CREATE INDEX idx_availability_slots_center ON public.availability_slots(center_id, date);
CREATE INDEX idx_availability_slots_status ON public.availability_slots(status);

-- Enable RLS
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated read availability_slots"
ON public.availability_slots FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff manage availability_slots"
ON public.availability_slots FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia'::app_role, 'administracion'::app_role, 'recepcion'::app_role, 'fisioterapeuta'::app_role, 'nutricionista'::app_role, 'psicotecnico'::app_role]));

CREATE POLICY "Staff update availability_slots"
ON public.availability_slots FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['gerencia'::app_role, 'administracion'::app_role, 'recepcion'::app_role, 'fisioterapeuta'::app_role, 'nutricionista'::app_role, 'psicotecnico'::app_role]));

CREATE POLICY "Admin delete availability_slots"
ON public.availability_slots FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['gerencia'::app_role, 'administracion'::app_role]));

-- Trigger for updated_at
CREATE TRIGGER update_availability_slots_updated_at
BEFORE UPDATE ON public.availability_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
