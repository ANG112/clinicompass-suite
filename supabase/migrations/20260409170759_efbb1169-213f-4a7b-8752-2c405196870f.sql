
CREATE TABLE public.staff_center_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_profile_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (staff_profile_id, center_id, service_id)
);

ALTER TABLE public.staff_center_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read staff_center_services"
  ON public.staff_center_services FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin manage staff_center_services"
  ON public.staff_center_services FOR INSERT
  TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia'::app_role, 'administracion'::app_role]));

CREATE POLICY "Admin update staff_center_services"
  ON public.staff_center_services FOR UPDATE
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia'::app_role, 'administracion'::app_role]));

CREATE POLICY "Admin delete staff_center_services"
  ON public.staff_center_services FOR DELETE
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia'::app_role, 'administracion'::app_role]));

CREATE INDEX idx_scs_staff ON public.staff_center_services(staff_profile_id);
CREATE INDEX idx_scs_center ON public.staff_center_services(center_id);
CREATE INDEX idx_scs_service ON public.staff_center_services(service_id);
