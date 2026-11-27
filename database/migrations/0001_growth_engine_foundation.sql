-- AutomaSuite Growth Engine — Sprint 1 foundation
-- Target: Neon PostgreSQL, development branch first.
-- Authentication identity and organisation membership are managed by Neon Auth.
-- App queries must verify the JWT with Neon Auth JWKS, set request.jwt.claims
-- transaction-locally, and SET LOCAL ROLE growth_app before accessing tenant data.

DO $$ BEGIN
  CREATE ROLE growth_app NOLOGIN NOBYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
GRANT growth_app TO automasuite_growth_owner;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO growth_app;

CREATE OR REPLACE FUNCTION app_private.current_user_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT ((NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid)
$$;

CREATE OR REPLACE FUNCTION app_private.is_org_member(target_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1
    FROM neon_auth.member m
    WHERE m."organizationId" = target_org_id
      AND m."userId" = app_private.current_user_id()
  )
$$;

GRANT SELECT ON neon_auth.member TO growth_app;
GRANT EXECUTE ON FUNCTION app_private.current_user_id() TO growth_app;
GRANT EXECUTE ON FUNCTION app_private.is_org_member(uuid) TO growth_app;

CREATE TABLE IF NOT EXISTS public.industry_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.industry_templates (id,name,description,configuration) VALUES
('real_estate','Real Estate','Property enquiries, buyer qualification, inspections and investor follow-up.','{"lead_fields":["property_interest","budget_range","preferred_location","purchase_timeline"],"pipeline":["New","Under Review","Qualified","Contacted","Nurturing","Inspection","Converted","Not a Fit"]}'::jsonb),
('retail_trading','Retail & Trading','Product enquiries, customer follow-up and order opportunities.','{"lead_fields":["product_interest","quantity","budget_range","purchase_timeline"],"pipeline":["New","Contacted","Considering","Order Pending","Converted","Not a Fit"]}'::jsonb),
('professional_services','Professional Services','Consultation enquiries, client qualification and onboarding.','{"lead_fields":["service_needed","business_type","urgency","budget_range"],"pipeline":["New","Discovery","Qualified","Proposal","Onboarding","Converted","Not a Fit"]}'::jsonb),
('construction','Construction & Development','Project enquiries, quotations and client relationships.','{"lead_fields":["project_type","project_location","scope","budget_range","timeline"],"pipeline":["New","Assessment","Qualified","Quotation","Negotiation","Won","Not a Fit"]}'::jsonb),
('education_training','Education & Training','Course enquiries, learner qualification and enrolment.','{"lead_fields":["course_interest","learning_goal","preferred_schedule","start_date"],"pipeline":["New","Enquiry","Qualified","Application","Enrolled","Not a Fit"]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.business_profiles (
  organization_id uuid PRIMARY KEY REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  industry_template_id text REFERENCES public.industry_templates(id),
  website_url text,
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  country_code text NOT NULL DEFAULT 'NG',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_settings (
  organization_id uuid PRIMARY KEY REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  currency_code char(3) NOT NULL DEFAULT 'NGN',
  locale text NOT NULL DEFAULT 'en-NG',
  business_description text,
  service_catalog jsonb NOT NULL DEFAULT '[]'::jsonb,
  brand_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL,
  is_terminal boolean NOT NULL DEFAULT false,
  outcome text CHECK (outcome IN ('won','lost') OR outcome IS NULL),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name),
  UNIQUE (organization_id, position)
);

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  organization_id uuid PRIMARY KEY REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  completed_steps text[] NOT NULL DEFAULT '{}',
  current_step text NOT NULL DEFAULT 'business_profile',
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organisation_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_stages_org_position_idx ON public.pipeline_stages(organization_id, position);
CREATE INDEX IF NOT EXISTS organisation_audit_logs_org_created_idx ON public.organisation_audit_logs(organization_id, created_at DESC);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_profiles_member_access ON public.business_profiles;
CREATE POLICY business_profiles_member_access ON public.business_profiles TO growth_app
  USING (app_private.is_org_member(organization_id))
  WITH CHECK (app_private.is_org_member(organization_id));
DROP POLICY IF EXISTS business_settings_member_access ON public.business_settings;
CREATE POLICY business_settings_member_access ON public.business_settings TO growth_app
  USING (app_private.is_org_member(organization_id))
  WITH CHECK (app_private.is_org_member(organization_id));
DROP POLICY IF EXISTS pipeline_stages_member_access ON public.pipeline_stages;
CREATE POLICY pipeline_stages_member_access ON public.pipeline_stages TO growth_app
  USING (app_private.is_org_member(organization_id))
  WITH CHECK (app_private.is_org_member(organization_id));
DROP POLICY IF EXISTS onboarding_progress_member_access ON public.onboarding_progress;
CREATE POLICY onboarding_progress_member_access ON public.onboarding_progress TO growth_app
  USING (app_private.is_org_member(organization_id))
  WITH CHECK (app_private.is_org_member(organization_id));
DROP POLICY IF EXISTS organisation_audit_logs_member_read ON public.organisation_audit_logs;
CREATE POLICY organisation_audit_logs_member_read ON public.organisation_audit_logs FOR SELECT TO growth_app
  USING (app_private.is_org_member(organization_id));
DROP POLICY IF EXISTS organisation_audit_logs_member_insert ON public.organisation_audit_logs;
CREATE POLICY organisation_audit_logs_member_insert ON public.organisation_audit_logs FOR INSERT TO growth_app
  WITH CHECK (app_private.is_org_member(organization_id) AND actor_user_id = app_private.current_user_id());

GRANT SELECT ON public.industry_templates TO growth_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_profiles, public.business_settings, public.pipeline_stages, public.onboarding_progress TO growth_app;
GRANT SELECT, INSERT ON public.organisation_audit_logs TO growth_app;
