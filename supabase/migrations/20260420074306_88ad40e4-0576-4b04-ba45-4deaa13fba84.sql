-- ============================================================
-- SESIONES: nuevo modelo de datos
-- ============================================================

-- Tabla principal: sesión
CREATE TABLE public.patient_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  session_number integer NOT NULL,
  session_date timestamptz NOT NULL DEFAULT now(),
  professional_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  summary text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'activa',
  created_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_sessions_owner_check CHECK (
    (patient_id IS NOT NULL AND contact_id IS NULL) OR
    (patient_id IS NULL  AND contact_id IS NOT NULL)
  )
);

CREATE INDEX idx_patient_sessions_patient ON public.patient_sessions(patient_id, session_number);
CREATE INDEX idx_patient_sessions_contact ON public.patient_sessions(contact_id, session_number);

-- Trigger updated_at
CREATE TRIGGER trg_patient_sessions_updated_at
BEFORE UPDATE ON public.patient_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Asignación automática de session_number por entidad
CREATE OR REPLACE FUNCTION public.assign_session_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  IF NEW.session_number IS NULL OR NEW.session_number = 0 THEN
    IF NEW.patient_id IS NOT NULL THEN
      SELECT COALESCE(MAX(session_number), 0) + 1 INTO next_num
      FROM public.patient_sessions WHERE patient_id = NEW.patient_id;
    ELSE
      SELECT COALESCE(MAX(session_number), 0) + 1 INTO next_num
      FROM public.patient_sessions WHERE contact_id = NEW.contact_id;
    END IF;
    NEW.session_number := next_num;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_patient_sessions_assign_number
BEFORE INSERT ON public.patient_sessions
FOR EACH ROW EXECUTE FUNCTION public.assign_session_number();

ALTER TABLE public.patient_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_sessions"
ON public.patient_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff create patient_sessions"
ON public.patient_sessions FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

CREATE POLICY "Staff update patient_sessions"
ON public.patient_sessions FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

CREATE POLICY "Admin delete patient_sessions"
ON public.patient_sessions FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));


-- Aportaciones (entries) a una sesión: histórico interno
CREATE TABLE public.patient_session_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.patient_sessions(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  content text NOT NULL DEFAULT '',
  transcription text,
  audio_file_path text,
  created_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_session_entries_session ON public.patient_session_entries(session_id, created_at DESC);

ALTER TABLE public.patient_session_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_session_entries"
ON public.patient_session_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff create patient_session_entries"
ON public.patient_session_entries FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

CREATE POLICY "Admin delete patient_session_entries"
ON public.patient_session_entries FOR DELETE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));