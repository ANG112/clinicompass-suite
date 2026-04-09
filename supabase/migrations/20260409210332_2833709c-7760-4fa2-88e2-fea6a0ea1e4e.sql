-- Add contact_id to patient_notes
ALTER TABLE public.patient_notes
  ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  ALTER COLUMN patient_id DROP NOT NULL;

-- Add constraint: at least one of patient_id or contact_id must be set
ALTER TABLE public.patient_notes
  ADD CONSTRAINT patient_notes_entity_check CHECK (patient_id IS NOT NULL OR contact_id IS NOT NULL);

-- Create index for contact_id queries
CREATE INDEX idx_patient_notes_contact_id ON public.patient_notes(contact_id) WHERE contact_id IS NOT NULL;

-- Add contact_id to patient_note_audios
ALTER TABLE public.patient_note_audios
  ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Add contact_id to patient_note_versions  
ALTER TABLE public.patient_note_versions
  ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE;