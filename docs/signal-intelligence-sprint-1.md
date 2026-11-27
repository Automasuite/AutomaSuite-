# SIGNAL Intelligence — Sprint 1 Foundation

## Product direction

SIGNAL Intelligence is the prospect-research and problem-led acquisition module inside AutomaSuite Growth Engine. The product direction is multi-tenant SaaS from the outset.

The initial first-party workspace configurations are:

- AutomaSuite: business automation, AI agents, CRM, websites and operational workflows.
- Digital Property Finder: property-buyer intelligence, buyer qualification and verified partner opportunities.
- KSI Apartments: residential buyer intelligence, property education and developer sales.

These are separate workspace configurations inside the product, not separate databases or cross-tenant shared records. Other SaaS customers can create custom workspaces.

## SIGNAL workflow

1. Spot an observable business signal.
2. Investigate the company and context.
3. Generate a problem hypothesis.
4. Prepare a discovery question.
5. Assess consequences after the prospect confirms the problem.
6. Link an appropriate solution only when fit is established.

Evidence, hypotheses and confirmed problems are stored separately. An AI confidence value is not proof that a problem exists.

## Sprint 1 scope delivered

Migration: `database/migrations/0002_signal_intelligence_foundation.sql`

The Neon development branch receives these tenant-scoped entities:

- `growth_workspaces`: separate business configurations per organisation.
- `prospect_segments`: target customer segments and qualification criteria.
- `prospect_companies`: prospect organisations and research state.
- `prospect_contacts`: contact records and communication-permission state.
- `business_signals`: observable events and evidence status.
- `research_evidence`: source records, excerpts, timestamps and verification.
- `problem_hypotheses`: possible problems and discovery questions.
- `hypothesis_evidence`: supporting, contradicting and contextual evidence links.
- `opportunity_assessments`: weighted fit assessment with problem confirmation tracked separately.

The opportunity score is computed from five bounded components: signal strength (20), evidence quality (20), potential impact (25), solution fit (20), and buying readiness (15).

## Tenant security

Every new entity carries `organization_id` and uses a composite foreign key when linking to another tenant-owned record. All nine tables have RLS enabled and forced. Access policies are granted only to the restricted `growth_app` role and call `app_private.is_org_member(organization_id)`.

Application code must verify the Neon Auth JWT, derive the active organisation from verified claims, set `request.jwt.claims` transaction-locally, and perform tenant operations as `growth_app`. Never use a database owner or bypass-RLS role for ordinary tenant operations.

## Scope boundaries

- Development branch only; no production deployment or production database changes.
- No live prospect scraping, bulk outreach, or messaging integrations in Sprint 1.
- No real customer data is seeded.
- All outreach must require human approval and respect permissions, opt-outs, applicable privacy law and provider terms.
- The DPF and KSI configurations remain separate from their existing production systems.

## Sprint 1 verification

- Confirm all nine tables exist on Neon development.
- Confirm RLS is enabled and forced on all nine tables.
- Confirm each table has an organisation-membership policy.
- Confirm only `growth_app` receives application CRUD grants.
- Confirm composite foreign keys preserve tenant ownership across linked records.
- Run application-level cross-tenant isolation tests before enabling any user-facing CRUD.

## Next sprint

Sprint 2 should add the server-only Neon data-access layer and typed repository functions, backed by verified Neon Auth sessions and transaction-local claims. It should not add AI research or outbound messaging until authenticated tenant access and auditability are verified.
