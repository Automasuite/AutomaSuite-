-- AutomaSuite Growth Engine — SIGNAL Intelligence Sprint 1 foundation
-- Target: dedicated AutomaSuite Neon development branch only.
-- Tenant isolation is enforced by organisation_id + growth_app RLS policies.
-- Application requests must verify Neon Auth JWTs, set request.jwt.claims
-- transaction-locally, and use the restricted growth_app role.

CREATE TABLE IF NOT EXISTS public.growth_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  slug text NOT NULL,
  display_name text NOT NULL,
  workspace_type text NOT NULL DEFAULT 'custom'
    CHECK (workspace_type IN ('automasuite','digital_property_finder','ksi_apartments','custom')),
  industry text,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.prospect_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  target_market text,
  qualification_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES public.growth_workspaces(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.prospect_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  segment_id uuid,
  company_name text NOT NULL,
  website_url text,
  industry text,
  country_code char(2),
  location text,
  company_description text,
  source_type text NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual','website','linkedin','referral','import','public_record','other')),
  source_url text,
  research_status text NOT NULL DEFAULT 'unreviewed'
    CHECK (research_status IN ('unreviewed','queued','in_progress','reviewed','insufficient_evidence')),
  created_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES public.growth_workspaces(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, segment_id)
    REFERENCES public.prospect_segments(organization_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.prospect_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  company_id uuid,
  full_name text NOT NULL,
  job_title text,
  email text,
  phone text,
  linkedin_url text,
  contact_source text NOT NULL DEFAULT 'manual'
    CHECK (contact_source IN ('manual','company_website','linkedin','referral','import','other')),
  contact_permission_status text NOT NULL DEFAULT 'unknown'
    CHECK (contact_permission_status IN ('unknown','permitted','restricted','opted_out')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES public.growth_workspaces(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id)
    REFERENCES public.prospect_companies(organization_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.business_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  company_id uuid,
  contact_id uuid,
  signal_type text NOT NULL,
  observed_summary text NOT NULL,
  source_url text,
  source_published_at timestamptz,
  observed_at timestamptz NOT NULL DEFAULT now(),
  evidence_status text NOT NULL DEFAULT 'unverified'
    CHECK (evidence_status IN ('unverified','verified','disputed','expired')),
  confidence numeric(4,3) NOT NULL DEFAULT 0.500
    CHECK (confidence >= 0 AND confidence <= 1),
  reviewed_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES public.growth_workspaces(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id)
    REFERENCES public.prospect_companies(organization_id, id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, contact_id)
    REFERENCES public.prospect_contacts(organization_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.research_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  company_id uuid,
  signal_id uuid,
  source_name text,
  source_url text NOT NULL,
  source_type text NOT NULL DEFAULT 'public_web'
    CHECK (source_type IN ('public_web','company_website','linkedin','user_supplied','official_record','other')),
  title text,
  excerpt text,
  published_at timestamptz,
  captured_at timestamptz NOT NULL DEFAULT now(),
  content_hash text,
  verification_status text NOT NULL DEFAULT 'unreviewed'
    CHECK (verification_status IN ('unreviewed','verified','rejected','stale')),
  verified_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES public.growth_workspaces(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id)
    REFERENCES public.prospect_companies(organization_id, id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, signal_id)
    REFERENCES public.business_signals(organization_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.problem_hypotheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  company_id uuid NOT NULL,
  signal_id uuid,
  hypothesis_title text NOT NULL,
  hypothesis text NOT NULL,
  rationale text,
  discovery_question text,
  potential_impact text,
  confidence numeric(4,3) NOT NULL DEFAULT 0.500
    CHECK (confidence >= 0 AND confidence <= 1),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','under_review','confirmed','rejected','needs_more_evidence','expired')),
  confirmation_notes text,
  confirmed_at timestamptz,
  reviewed_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES public.growth_workspaces(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id)
    REFERENCES public.prospect_companies(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, signal_id)
    REFERENCES public.business_signals(organization_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.hypothesis_evidence (
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  hypothesis_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  relationship text NOT NULL DEFAULT 'supports'
    CHECK (relationship IN ('supports','contradicts','context')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, hypothesis_id, evidence_id),
  FOREIGN KEY (organization_id, hypothesis_id)
    REFERENCES public.problem_hypotheses(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, evidence_id)
    REFERENCES public.research_evidence(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.opportunity_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  company_id uuid NOT NULL,
  hypothesis_id uuid,
  signal_strength_score smallint NOT NULL DEFAULT 0 CHECK (signal_strength_score BETWEEN 0 AND 20),
  evidence_quality_score smallint NOT NULL DEFAULT 0 CHECK (evidence_quality_score BETWEEN 0 AND 20),
  potential_impact_score smallint NOT NULL DEFAULT 0 CHECK (potential_impact_score BETWEEN 0 AND 25),
  solution_fit_score smallint NOT NULL DEFAULT 0 CHECK (solution_fit_score BETWEEN 0 AND 20),
  buying_readiness_score smallint NOT NULL DEFAULT 0 CHECK (buying_readiness_score BETWEEN 0 AND 15),
  total_score smallint GENERATED ALWAYS AS (
    signal_strength_score + evidence_quality_score + potential_impact_score
    + solution_fit_score + buying_readiness_score
  ) STORED,
  problem_confirmed boolean NOT NULL DEFAULT false,
  assessment_notes text,
  assessed_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, workspace_id)
    REFERENCES public.growth_workspaces(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, company_id)
    REFERENCES public.prospect_companies(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, hypothesis_id)
    REFERENCES public.problem_hypotheses(organization_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS growth_workspaces_org_active_idx
  ON public.growth_workspaces(organization_id, is_active);
CREATE INDEX IF NOT EXISTS prospect_segments_workspace_active_idx
  ON public.prospect_segments(organization_id, workspace_id, is_active);
CREATE INDEX IF NOT EXISTS prospect_companies_workspace_created_idx
  ON public.prospect_companies(organization_id, workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS prospect_contacts_company_idx
  ON public.prospect_contacts(organization_id, company_id);
CREATE INDEX IF NOT EXISTS business_signals_company_observed_idx
  ON public.business_signals(organization_id, company_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS research_evidence_company_captured_idx
  ON public.research_evidence(organization_id, company_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS problem_hypotheses_company_status_idx
  ON public.problem_hypotheses(organization_id, company_id, status);
CREATE INDEX IF NOT EXISTS opportunity_assessments_company_score_idx
  ON public.opportunity_assessments(organization_id, company_id, total_score DESC);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'growth_workspaces','prospect_segments','prospect_companies','prospect_contacts',
    'business_signals','research_evidence','problem_hypotheses',
    'hypothesis_evidence','opportunity_assessments'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_member_access', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I TO growth_app USING (app_private.is_org_member(organization_id)) WITH CHECK (app_private.is_org_member(organization_id))',
      table_name || '_member_access', table_name
    );
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.growth_workspaces,
  public.prospect_segments,
  public.prospect_companies,
  public.prospect_contacts,
  public.business_signals,
  public.research_evidence,
  public.problem_hypotheses,
  public.hypothesis_evidence,
  public.opportunity_assessments
TO growth_app;

COMMENT ON TABLE public.business_signals IS 'Observable prospect signals. Evidence status is distinct from AI confidence.';
COMMENT ON TABLE public.research_evidence IS 'Source records supporting or contradicting prospect research and signals.';
COMMENT ON TABLE public.problem_hypotheses IS 'Potential problems only; confirmation requires an explicit review/discovery outcome.';
COMMENT ON TABLE public.opportunity_assessments IS 'Weighted fit assessment; score never implies a confirmed problem.';
