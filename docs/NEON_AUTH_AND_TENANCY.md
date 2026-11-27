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
- A separate `growth_runtime` login role is required for the deployed application. It must be `LOGIN NOINHERIT NOBYPASSRLS` and receive membership in `growth_app`. The runtime role must explicitly assume `growth_app` inside each transaction; it must not inherit its privileges outside that transaction.
- Do not use a broad Neon admin role or owner connection for normal application requests.
- Tenant tables use both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- Membership is checked against `neon_auth.member` using the verified JWT subject from transaction-local `request.jwt.claims`.

### Runtime role provisioning (development branch only)

Run this as the database owner in the Neon SQL editor after generating a unique password and storing it in a secure secret manager. Do not commit the password or paste it into chat:

```sql
CREATE ROLE growth_runtime
  LOGIN NOINHERIT NOBYPASSRLS
  PASSWORD 'REPLACE_WITH_A_UNIQUE_SECRET';
GRANT growth_app TO growth_runtime;
GRANT CONNECT ON DATABASE neondb TO growth_runtime;
```

If the role already exists, use `ALTER ROLE growth_runtime WITH LOGIN NOINHERIT NOBYPASSRLS PASSWORD '...';` and then re-apply the membership grant. The app connection string must use `growth_runtime`, not `automasuite_growth_owner`. The server must run `SET LOCAL ROLE growth_app` within the same transaction in which it sets verified claims. A direct query made as `growth_runtime` without assuming `growth_app` should have no tenant-table privileges.

## Required request flow

1. Retrieve the server-side Neon Auth session.
2. Obtain the signed access JWT from the Neon Auth server API; do not mistake the opaque session-cookie token for a JWT.
3. Verify the JWT signature and claims against the configured JWKS URL; enforce the expected issuer, expiry and subject, and audience if configured.
4. Determine the active organisation from the authenticated session and verify membership. Never trust an organisation ID supplied by the browser without checking membership.
5. Begin a database transaction using the `growth_runtime` connection.
6. Set the verified token payload transaction-locally:
   `SELECT set_config('request.jwt.claims', '<verified-claims-json>', true)`.
7. Assume the restricted application role:
   `SET LOCAL ROLE growth_app`.
8. Perform tenant-scoped reads/writes. RLS policies verify membership again inside PostgreSQL.
9. Commit/rollback the transaction; transaction-local role and claims do not leak into another request.

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
- The `growth_runtime` login role has not yet been provisioned; no runtime database credential is stored in the repository.

This verifies the database foundation, not the end-to-end sign-in experience. Frontend authentication, signed-JWT retrieval/verification, server-only database adapter, organisation onboarding and cross-tenant integration tests remain to be implemented.


## Server-side workspace provisioning adapter

Implementation: `lib/db/tenant-workspace.ts`.

- Calls Neon Auth's server-side `auth.token()` endpoint to obtain the signed access JWT. Do not use `getSession().data.session.token` as a JWT; that is the opaque session-cookie identifier.
- Verifies the JWT signature through the configured JWKS endpoint, enforces the explicitly configured issuer and matches `sub` to the authenticated session user.
- Opens a database transaction, sets the verified claims with transaction-local `set_config(..., true)`, then uses `SET LOCAL ROLE growth_app`.
- Checks the current user's organisation membership again in PostgreSQL before inserting the business profile, settings, industry pipeline stages, onboarding progress and audit event.
- Onboarding retries use the authenticated user's organisation list; no organisation ID is accepted from form input.
- The workspace profile and default pipeline are written atomically. If provisioning fails, the Auth organisation remains and the onboarding page offers a recovery path.

Before enabling this flow in a running environment:
1. Provision the dedicated `growth_runtime` role with `LOGIN NOINHERIT NOBYPASSRLS`, grant it membership in `growth_app`, and set its connection string only in the deployment secret store.
2. Set `NEON_AUTH_ISSUER` to the exact `iss` claim observed from a verified Neon Auth access JWT. Do not guess the issuer.
3. Install dependencies and run type-check, lint, production build, sign-in and onboarding tests.
4. Test tenant isolation with two independent test organisations and verify a member cannot read or write the other organisation's rows.

The adapter is committed but has not yet been compiled or executed against a live authenticated application session. The development database currently contains the five tenant foundation tables, but its role list still has only `growth_app` and `automasuite_growth_owner`; `growth_runtime` is not yet provisioned.
