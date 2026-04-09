
-- Current structured notes per patient
CREATE TABLE public.patient_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_notes" ON public.patient_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage patient_notes" ON public.patient_notes FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));
CREATE POLICY "Staff update patient_notes" ON public.patient_notes FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));
CREATE POLICY "Admin delete patient_notes" ON public.patient_notes FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

-- Version history
CREATE TABLE public.patient_note_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_note_id uuid NOT NULL REFERENCES public.patient_notes(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  content text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_note_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_note_versions" ON public.patient_note_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create patient_note_versions" ON public.patient_note_versions FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

-- Audio recordings metadata
CREATE TABLE public.patient_note_audios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_note_id uuid NOT NULL REFERENCES public.patient_notes(id) ON DELETE CASCADE,
  note_version_id uuid REFERENCES public.patient_note_versions(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_name text,
  duration_seconds integer,
  transcription text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_note_audios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_note_audios" ON public.patient_note_audios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create patient_note_audios" ON public.patient_note_audios FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));
CREATE POLICY "Staff update patient_note_audios" ON public.patient_note_audios FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

-- Storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-audios', 'patient-audios', false);

CREATE POLICY "Auth read patient audios" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patient-audios');
CREATE POLICY "Staff upload patient audios" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patient-audios');
CREATE POLICY "Admin delete patient audios" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patient-audios' AND has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

-- Trigger for updated_at
CREATE TRIGGER update_patient_notes_updated_at BEFORE UPDATE ON public.patient_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
