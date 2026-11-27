# Sprint 1 — Neon Auth and Tenant Access

## Environment

- Neon project: `automasuite-growth-engine`
- Neon project ID: `cold-sun-60524089`
- Development branch: `development`
- Development branch ID: `br-dawn-cherry-bj61s27r`
- Database: `neondb`
- Auth provider: Neon Managed Better Auth
- Auth is provisioned on the development branch only.

## Development Auth endpoints

- Auth base URL: `https://ep-lingering-hall-bj2ri650.neonauth.c-3.eu-west-2.aws.neon.tech/neondb/auth`
- JWKS URL: `https://ep-lingering-hall-bj2ri650.neonauth.c-3.eu-west-2.aws.neon.tech/neondb/auth/.well-known/jwks.json`

Do not commit database connection strings, passwords, Neon Auth server secrets, private signing keys, or other credentials. Supply them through server-only environment variables in local development and the deployment provider. The browser must never receive the database owner connection string.

## Neon Auth data model

Neon Auth provisions and manages:
- `neon_auth.user`
- `neon_auth.organization`
- `neon_auth.member`
- Related account, session, invitation, verification and JWKS tables.

Use Neon Auth's organisation and membership records as the identity source. Application-owned business configuration references `neon_auth.organization.id`; do not create a competing user or organisation identity table.

## Database roles and tenant isolation

- `automasuite_growth_owner`: administrative/migration role; never use for ordinary tenant CRUD.
- `growth_app`: restricted `NOLOGIN NOBYPASSRLS` role for application data operations.
- `growth_app` is granted to the owner role so the server can assume it with `SET LOCAL ROLE growth_app` inside a transaction.
- Tenant tables use both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- Membership is checked against `neon_auth.member` using the verified JWT subject from transaction-local `request.jwt.claims`.

## Required request flow

1. Retrieve the server-side Neon Auth session.
2. Verify the access token signature and claims against the JWKS URL; enforce issuer, audience where configured, expiry and subject.
3. Determine the active organisation from the authenticated session and verify membership. Never trust an organisation ID supplied by the browser without checking membership.
4. Begin a database transaction.
5. Set the verified token payload transaction-locally:
   `SELECT set_config('request.jwt.claims', '<verified-claims-json>', true)`.
6. Assume the restricted application role:
   `SET LOCAL ROLE growth_app`.
7. Perform tenant-scoped reads/writes. RLS policies verify membership again inside PostgreSQL.
8. Commit/rollback the transaction; transaction-local role and claims do not leak into another request.

The implementation must not use a persistent session-level JWT setting. Do not use the owner role for tenant reads/writes. Do not accept user IDs, roles or organisation membership from client-side metadata as authoritative.

## Initial schema

Migration source: `database/migrations/0001_growth_engine_foundation.sql`

Tables:
- `industry_templates`
- `business_profiles`
- `business_settings`
- `pipeline_stages`
- `onboarding_progress`
- `organisation_audit_logs`

Industry templates seeded:
- Real Estate
- Retail & Trading
- Professional Services
- Construction & Development
- Education & Training

## Verification completed on development

- Neon Auth provisioned and configuration read back successfully.
- Development branch reports `ready`.
- Five industry templates are readable through the restricted `growth_app` role.
- Tenant tables return no records when no verified JWT claims are present.
- RLS and FORCE RLS are enabled on all five tenant tables.
- `growth_app.rolbypassrls = false`.

This verifies the database foundation, not the end-to-end sign-in experience. Frontend authentication, token verification, server-only database adapter, organisation onboarding and cross-tenant integration tests remain to be implemented.
