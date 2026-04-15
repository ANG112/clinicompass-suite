
CREATE TABLE public.specialties (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon_name text NOT NULL DEFAULT 'Activity',
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read specialties" ON public.specialties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage specialties" ON public.specialties FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin update specialties" ON public.specialties FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
CREATE POLICY "Admin delete specialties" ON public.specialties FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

INSERT INTO public.specialties (name, slug, icon_name, position) VALUES
  ('Fisioterapia', 'fisioterapia', 'Activity', 0),
  ('Nutrición', 'nutricion', 'Apple', 1),
  ('Psicotécnicos', 'psicotecnicos', 'Brain', 2);
