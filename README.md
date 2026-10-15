# AutomaSuite LeadGen Pro

A lead-generation and growth workspace from AutomaSuite. The first MVP focuses on a responsive dashboard, lead capture, lead status management, and signal-led next actions.

## Current MVP

- Responsive overview dashboard with lead, priority, qualification, and conversion metrics.
- Lead manager with search and status filters.
- Add-lead form with source and buying-signal context.
- Inline lead status updates and browser-local persistence for a demo workspace.
- Sample records clearly intended for demonstration, not real performance claims.
- Isolated Supabase schema for leads, lead activities, campaigns, and evidence-backed signals, with owner-scoped row-level security.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The current UI uses demo records stored in the browser's local storage. This is useful for previewing the workflow, but it is not shared, backed up, or suitable for multi-user production.

## Database setup — separate project required

1. Create a dedicated Supabase project for AutomaSuite LeadGen Pro.
2. Apply `supabase/migrations/202610150001_leadgen_core.sql` to that project only.
3. Configure Supabase URL and publishable key once authentication and the server/client data adapters are implemented.
4. Do not point this product at the existing AutomaSuite shared database or KSI Intelligence database.

The migration is intentionally stored in source control and has **not** been applied to any existing database.

## Product principles

- Brand: **AutomaSuite**.
- Product: **LeadGen Pro**.
- Promise: find leads, engage with context, convert more customers, and grow revenue.
- Signal-led outreach: recommend contact now, research/nurture, or don't contact yet based on evidence and fit.
- Messaging integrations must use approved APIs and respect consent, opt-outs, rate limits, and platform policies.
- Keep this repository and its deployment isolated from KSI Intelligence and other production systems.

## Next implementation steps

1. Provision a dedicated Supabase project and add secure authentication.
2. Replace browser-only storage with owner-scoped Supabase CRUD.
3. Add activity timelines and campaign workflows.
4. Integrate approved WhatsApp messaging and Taiwo AI after credentials and channel behavior are verified.
5. Add tests, deployment checks, and production safeguards.
