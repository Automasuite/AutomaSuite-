# Vanta-Inspired Agent Operating System
## Technical Architecture & Implementation Plan

**Target product:** Abuja Property Lead Intelligence  
**Foundation candidate:** `Automasuite/AutomaSuite-` (AutomaSuite LeadGen Pro)  
**Architecture:** Modular monolith  
**Deployment direction:** Existing Vercel project, after build remediation  
**Data direction:** Dedicated Supabase project; do not reuse KSI Intelligence or an unverified shared database  
**Status:** Architecture approved; implementation staged behind an isolated branch.

---

## 1. Objective

Evolve the existing lead-generation workspace into an agent operating system that discovers, researches, qualifies and follows up property leads. The first release must deliver a reliable, auditable lead workflow—not unrestricted autonomy.

Core outcome: move an authorised lead from discovery through evidence-backed qualification to a relevant, approved engagement action.

## 2. Architecture decisions

- Modular monolith first; no premature microservices.
- Preserve the existing Next.js 15 / React 19 / TypeScript application.
- Keep the current Vercel project as the deployment target, subject to build health and configuration verification.
- Use Supabase Auth and PostgreSQL with workspace-scoped Row Level Security.
- Use LangGraph JS for stateful orchestration and resumable workflows.
- Use Supabase Queues (PGMQ) for durable task delivery; Cron may enqueue scheduled work.
- Keep model providers, search providers, MCP tools and messaging channels behind typed adapters.
- Persist run state, checkpoints, approvals, evidence and audit events.
- All external side effects must be permission-checked, idempotent and auditable.
- No production changes, external messages, or irreversible actions without explicit approval.

## 3. Proposed logical modules

1. **Agent registry:** agent definitions, versions, instructions, tool permissions and activation state.
2. **Orchestrator:** task planning, delegation, graph execution, checkpointing and resumption.
3. **Tool gateway:** validated tool catalog, MCP/API adapters, rate limits and invocation records.
4. **Memory and knowledge:** scoped retrieval, source evidence, verification status and historical context.
5. **Execution workers:** queue consumers, bounded execution, retries, cancellation and idempotency.
6. **Governance:** human approvals, roles, tenant isolation, audit history and monitoring.
7. **Lead intelligence:** discovery, deduplication, enrichment, qualification, matching and follow-up.

These are application modules, not separately deployed services in the first release.

## 4. Initial agent roles

- **Lead Discovery:** find potential buyers from authorised sources and capture source/contact evidence.
- **Lead Research:** enrich records, verify available contact details, detect duplicates and expose missing facts.
- **Buyer Qualification:** assess purpose, budget, location, property preferences, timeline, readiness and unresolved objections.
- **Property Intelligence:** match qualified requirements against approved inventory and flag information requiring confirmation.
- **Engagement & Follow-up:** recommend next steps, draft personalised messages and maintain follow-up tasks.

The central orchestrator selects and coordinates these roles. An agent role does not grant permission to perform every tool action.

## 5. Lead workflow

`SIGNAL → INTENT → BUYER PROFILE → QUALIFY → MATCH → CONFIDENCE → ACTION → SALE → LEARNING`

1. Accept a user instruction or lead event.
2. Resolve the source and allowed discovery scope.
3. Discover and extract available lead information.
4. Deduplicate against workspace records.
5. Store source URL, observed time and evidence excerpt.
6. Separate verified facts, inferences and unknowns.
7. Assess intent and identify missing qualification data.
8. Generate an explainable priority recommendation.
9. Recommend contact, research/nurture or do-not-contact.
10. Persist the lead and activity timeline.
11. Prepare a personalised message or next action.
12. Require approval before outbound communication.
13. Record outcome and update the next action.

A missing fact remains unknown. An inference must never be presented as verified information.

## 6. Technology

| Concern | Initial choice |
|---|---|
| Web application | Existing Next.js 15 / React 19 / TypeScript |
| Authentication | Supabase Auth + SSR |
| Database | Dedicated Supabase PostgreSQL |
| Orchestration | LangGraph JS |
| Durable queue | Supabase Queues / PGMQ |
| Scheduling | Supabase Cron, where available |
| Retrieval | PostgreSQL; pgvector only when a demonstrated retrieval need exists |
| Tool integration | Typed adapters and MCP |
| Browser automation | Playwright in a later bounded worker |
| Hosting | Existing Vercel project after remediation |
| Tests | Unit, integration, security and agent evaluations |
| Observability | Structured logs, run/step IDs and OpenTelemetry-compatible traces |

Pin compatible dependency versions and commit a lockfile. Confirm current plan limits and provider compatibility before choosing worker batch sizes or runtime budgets.

## 7. Data model

Existing migration (not yet applied according to the repository README) defines:
- `leads`
- `lead_activities`
- `campaigns`
- `lead_signals`

Proposed additive tables, each with workspace ownership and appropriate RLS:

- `workspaces`, `workspace_memberships`
- `agent_definitions`, `agent_versions`
- `agent_runs`, `agent_run_steps`
- `agent_tool_calls`
- `agent_approvals`
- `agent_schedules`
- `agent_memory`
- `agent_events`
- `source_evidence`
- `lead_profiles`
- `property_opportunities`
- `lead_property_matches`

Use foreign keys, check constraints, indexes and unique idempotency keys where appropriate. Workspace authorization must be enforced in the database, not merely hidden in the UI. Privileged service-role operations stay server-side. Never use the KSI Intelligence database for this application.

## 8. Run lifecycle

States: `Draft`, `Queued`, `Running`, `Awaiting approval`, `Succeeded`, `Failed`, `Cancelled`, `Paused`.

1. Create a run and validate caller/workspace permissions.
2. Enqueue a durable task with an idempotency key.
3. Worker claims a bounded task.
4. Load the immutable agent version and permitted tool set.
5. Retrieve only authorised context.
6. Execute a graph step and checkpoint state.
7. Pause at approval gates when required.
8. Resume from checkpoint after approval.
9. Verify expected result and record final status.
10. Emit audit and monitoring events.

Retries must not duplicate leads, messages, or external mutations. Failed steps must retain enough context for safe diagnosis and retry.

## 9. API surface (proposed)

- `POST /api/agents/runs`
- `GET /api/agents/runs`
- `GET /api/agents/runs/[id]`
- `POST /api/agents/runs/[id]/approve`
- `POST /api/agents/runs/[id]/reject`
- `POST /api/agents/runs/[id]/retry`
- `POST /api/agents/runs/[id]/cancel`
- `GET /api/agents`
- `POST /api/leads`
- `PATCH /api/leads/[id]`
- `POST /api/internal/agent-worker`

The worker endpoint must use service-to-service authentication, input validation and replay protection. It must not be an unrestricted public execution endpoint.

## 10. Approval matrix

| Action | Initial policy |
|---|---|
| Research and retrieval | Automatic within approved source scope |
| Enrichment and deduplication | Automatic with provenance |
| Lead scoring | Automatic recommendation; explainable |
| Internal CRM creation/update | Controlled by workspace permissions |
| WhatsApp/email drafting | Automatic |
| Outbound message sending | Human approval |
| Bulk outreach | Explicit approval and consent checks |
| Record deletion | Restricted and auditable |
| Property/title/availability claims | Must be verified; human review where material |

Preparing an action is not the same as executing it. UI status must reflect the actual result returned by the provider.

## 11. Security and brand boundaries

- Workspace membership and role checks on every server action.
- RLS on all exposed tenant-owned tables.
- No service-role key in client bundles.
- No authorization decisions based on user-editable metadata.
- Tool allowlists, argument schemas, timeouts and rate limits.
- Treat web pages, files and lead-submitted content as untrusted input.
- Prompt injection cannot grant permissions or change system policy.
- Record who/what initiated every consequential operation.
- Separate KSI, DPF and other brands' data, credentials, inventory, knowledge and communications.
- Preserve cancellation, pause and approval controls.

## 12. Repository structure (proposed)

```text
app/
  api/agents/
  api/leads/
  api/internal/agent-worker/
  dashboard/
components/
  agents/
  approvals/
  leads/
  execution-monitor/
lib/
  agents/registry/
  agents/orchestration/
  agents/graphs/
  agents/memory/
  agents/execution/
  agents/tools/
  leads/discovery/
  leads/qualification/
  leads/scoring/
  integrations/
  security/
  database/
supabase/
  migrations/
  functions/
tests/
  unit/
  integration/
  security/
  agent-evaluations/
```

Adapt to the repository's existing conventions rather than moving or replacing existing files wholesale.

## 13. Delivery plan

### Phase 0 — Baseline and protection
- Confirm repository, branches, commit baseline and Vercel Git linkage.
- Diagnose the current failed Vercel build.
- Inspect branch-specific changes and existing CI.
- Confirm dedicated Supabase project ownership, status and region.
- Establish an isolated development branch and rollback notes.
- Do not apply database migrations or alter production configuration.

**Exit:** target repository and safe development path confirmed.

### Phase 1 — Stabilise the app
- Reproduce lint/type/build failure on an isolated environment.
- Fix the root cause, not just suppress checks.
- Pin dependencies and generate a lockfile.
- Run lint, typecheck, build and baseline UI tests.
- Verify preview deployment without promoting production.

**Exit:** reproducible green build and usable preview.

### Phase 2 — Identity and data foundation
- Provision/confirm dedicated Supabase project.
- Implement authentication and workspace membership.
- Review and apply the existing lead schema to the dedicated project only.
- Add reviewed workspace/RLS migrations.
- Replace browser-only demo persistence with authenticated CRUD.
- Add lead activity history and audit events.

**Exit:** persistent, authenticated, tenant-isolated lead management.

### Phase 3 — Agent runtime MVP
- Add typed agent registry and immutable versions.
- Add LangGraph JS orchestration and checkpoint persistence.
- Add durable queue worker, run states and retry/idempotency.
- Add tool gateway and approval records.
- Add run monitor and audit trail.

**Exit:** one agent completes a bounded task with traceable evidence and resumable state.

### Phase 4 — Property lead intelligence
- Implement authorised discovery connectors.
- Add evidence capture and deduplication.
- Add buyer profile and qualification.
- Add transparent lead-priority scoring.
- Add property matching against approved inventory.
- Add personalised WhatsApp drafts and follow-up tasks.

**Exit:** an authorised lead moves from discovery to an approved engagement recommendation.

### Phase 5 — Controlled autonomy
- Add event-triggered and scheduled runs.
- Add agent delegation and scoped memory retrieval.
- Add approved MCP tools.
- Add Playwright only for authorised browser tasks in a bounded worker.
- Add evaluation datasets, cost controls and failure recovery.

**Exit:** reliable multi-step execution with explicit permissions and recovery.

### Phase 6 — Release
- Unit/integration/security/RLS tests.
- Cross-workspace isolation tests.
- Agent quality and prompt-injection evaluations.
- Preview validation and rollback rehearsal.
- Production release only after explicit approval.

**Exit:** verified release with a tested recovery path.

## 14. Acceptance criteria

1. Authorised users can create and configure agents.
2. Tasks and runs are persisted.
3. Agents use only the assigned tools and workspace data.
4. Research findings include source evidence.
5. Facts, inferences and unknowns are distinguishable.
6. Qualification recommendations are explainable.
7. Follow-up drafts can be reviewed before sending.
8. Outbound actions cannot bypass approval.
9. Failed tasks can resume without duplicate side effects.
10. Every run has a reviewable audit history.
11. Cross-workspace access is denied by database policy.
12. Existing production applications remain unchanged and recoverable.

## 15. Known baseline risks

- The existing Vercel project currently reports a failed build (`lint_or_type_error`); exact failing log lines still need retrieval.
- The project reports `live: false`; production health and intended target need confirmation.
- The existing Supabase project discovered in the account is inactive; it is not assumed to be the LeadGen database.
- The repository README says the lead migration is unapplied and requires a dedicated project.
- No npm/pnpm lockfile was found at the inspected root paths.
- Existing demo lead records are illustrative, not actual property leads.
- Search, maps and WhatsApp credentials/permissions remain unverified.

## 16. Release/change-control policy

All work starts from the isolated feature branch. Main and production are not modified during development. Database migrations are reviewed and applied only to the dedicated project. Preview deployments are tested before release. Production deployment, external messaging activation, destructive changes and irreversible actions require explicit approval.

**First measurable outcome:** a verified lead discovery-to-qualification-to-approved-follow-up workflow, with evidence and a complete audit trail.
