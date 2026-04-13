
-- 1. Patient voice edits log
CREATE TABLE public.patient_voice_edits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  audio_file_path text,
  transcription text,
  interpreted_instruction text,
  fields_changed jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_voice_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_voice_edits" ON public.patient_voice_edits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff create patient_voice_edits" ON public.patient_voice_edits
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

-- 2. Patient synopsis (one per patient/contact)
CREATE TABLE public.patient_synopsis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE UNIQUE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE UNIQUE,
  content text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_synopsis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_synopsis" ON public.patient_synopsis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff create patient_synopsis" ON public.patient_synopsis
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

CREATE POLICY "Staff update patient_synopsis" ON public.patient_synopsis
  FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

CREATE TRIGGER update_patient_synopsis_updated_at
  BEFORE UPDATE ON public.patient_synopsis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Patient session notes
CREATE TABLE public.patient_session_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  audio_file_path text,
  transcription text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_session_notes" ON public.patient_session_notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff create patient_session_notes" ON public.patient_session_notes
  FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));
