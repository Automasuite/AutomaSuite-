# AutomaSuite Growth Engine

A configurable, multi-tenant business growth platform from AutomaSuite. It brings enquiry capture, lead management, customer intelligence, knowledge assistance, appointments and workflow automation into one workspace.

## Current repository foundation

- Existing LeadGen Pro dashboard retained as the CRM starting point.
- Existing local-storage records remain demo-only and are not production customer data.
- Neon PostgreSQL is the database platform for Growth Engine.
- Neon Managed Better Auth provides the authentication and organisation-membership foundation.
- A dedicated Neon project is used exclusively for this product; do not connect KSI Intelligence, DPF, or other product databases.
- Organisation-scoped tables use PostgreSQL Row-Level Security (RLS).
- Industry templates are seeded for real estate, retail and trading, professional services, construction and education/training.

## Database environments

Neon project: `automasuite-growth-engine`

- Primary branch: `main`
- Development branch: `development`
- Database: `neondb`
- PostgreSQL: 18
- Region: AWS EU West 2

The Sprint 1 schema is recorded in `database/migrations/0001_growth_engine_foundation.sql`. It has been applied and verified on the Neon `development` branch only. Do not apply it to unrelated databases.

## Authentication and tenant security

Neon Auth owns user identities and organisation membership in the `neon_auth` schema. Application tables reference Neon Auth organisation IDs.

The application server must:
1. Validate the incoming Neon Auth session/JWT against the configured Neon Auth issuer/JWKS.
2. Derive the user ID and active organisation from the verified session, never from untrusted client-supplied identity claims.
3. Open a transaction and set verified JWT claims transaction-locally using `request.jwt.claims`.
4. Execute tenant data operations as the restricted `growth_app` database role (which has `NOBYPASSRLS`).
5. Use organisation membership checks enforced by PostgreSQL RLS in addition to application-level permission checks.

Never expose the database connection string, database owner credentials, Neon Auth server secrets, or privileged credentials to browser code. Use a server-only environment configuration. Do not use the database owner role for ordinary tenant data queries.

## Industry templates

- Real Estate
- Retail & Trading
- Professional Services
- Construction & Development
- Education & Training

Templates configure business fields, qualification questions, pipeline stages and operational defaults. They do not create separate codebases or bypass tenant isolation.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The dashboard still uses demo-only browser persistence. Neon Auth server/client scaffolding, authentication routes, account/organisation views and protected workspace routing have been added on the development branch. The frontend sign-in flow has not yet been build-tested or end-to-end verified, and the CRM database adapter remains to be connected.

## Product principles

- Clarify customer needs before recommending actions.
- Base lead-intelligence recommendations on evidence, fit and consent.
- Do not invent customer intent, buying signals, prices, availability or outcomes.
- Respect contact permissions, opt-outs and approved messaging APIs.
- Keep every organisation's records and knowledge isolated.
- Keep this repository and its deployment isolated from KSI Intelligence, DPF and other products.

## Next implementation steps

1. Configure local/deployment environment variables from `.env.example` without committing secrets.
2. Build and verify the Neon Auth screens, session flow and organisation management.
3. Add a server-only Neon database adapter that verifies sessions and sets transaction-local JWT claims before assuming `growth_app`.
4. Integrate organisation workspace creation and business onboarding.
5. Replace demo-only lead persistence with tenant-scoped database operations.
6. Add integration and cross-tenant RLS tests before production deployment.
