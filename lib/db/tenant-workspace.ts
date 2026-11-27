import "server-only";

import { Pool, type PoolClient } from "@neondatabase/serverless";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { auth } from "@/lib/auth/server";

const connectionString = process.env.DATABASE_URL;
const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
const issuer = process.env.NEON_AUTH_ISSUER;

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!jwksUrl) throw new Error("NEON_AUTH_JWKS_URL is required");
if (!issuer) throw new Error("NEON_AUTH_ISSUER is required");

const pool = new Pool({ connectionString, max: 5 });
const jwks = createRemoteJWKSet(new URL(jwksUrl));

type TokenResponse = { data?: { token?: string }; token?: string };

async function getVerifiedClaims(expectedUserId: string) {
  // Neon Auth's token endpoint returns the signed JWT used by Neon RLS.
  // The opaque session cookie token from getSession() is NOT a JWT.
  const response = await auth.token() as TokenResponse;
  const token = response.data?.token ?? response.token;
  if (!token) throw new Error("Neon Auth did not return an access JWT");

  const { payload } = await jwtVerify(token, jwks, { issuer });
  if (typeof payload.sub !== "string" || payload.sub !== expectedUserId) {
    throw new Error("Authenticated subject does not match the active session");
  }
  return payload;
}

async function withTenantRole<T>(
  userId: string,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const claims = await getVerifiedClaims(userId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await client.query("SET LOCAL ROLE growth_app");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function provisionBusinessWorkspace(input: {
  userId: string;
  organizationId: string;
  businessName: string;
  industryTemplateId: string;
}) {
  const pipelineByIndustry: Record<string, string[]> = {
    real_estate: ["New", "Under Review", "Qualified", "Contacted", "Nurturing", "Inspection", "Converted", "Not a Fit"],
    retail_trading: ["New", "Contacted", "Considering", "Order Pending", "Converted", "Not a Fit"],
    professional_services: ["New", "Discovery", "Qualified", "Proposal", "Onboarding", "Converted", "Not a Fit"],
    construction: ["New", "Assessment", "Qualified", "Quotation", "Negotiation", "Won", "Not a Fit"],
    education_training: ["New", "Enquiry", "Qualified", "Application", "Enrolled", "Not a Fit"],
  };
  const stages = pipelineByIndustry[input.industryTemplateId];
  if (!stages) throw new Error("Unsupported industry template");

  return withTenantRole(input.userId, async (client) => {
    const membership = await client.query(
      'SELECT 1 FROM neon_auth.member WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1',
      [input.organizationId, input.userId],
    );
    if (membership.rowCount !== 1) throw new Error("User is not a member of this organisation");

    await client.query(
      `INSERT INTO public.business_profiles (organization_id, display_name, industry_template_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           industry_template_id = EXCLUDED.industry_template_id,
           updated_at = now()`,
      [input.organizationId, input.businessName, input.industryTemplateId],
    );
    await client.query(
      `INSERT INTO public.business_settings (organization_id)
       VALUES ($1) ON CONFLICT (organization_id) DO NOTHING`,
      [input.organizationId],
    );
    for (const [position, name] of stages.entries()) {
      await client.query(
        `INSERT INTO public.pipeline_stages (organization_id, name, position, is_terminal)
         VALUES ($1, $2, $3, $4) ON CONFLICT (organization_id, name) DO NOTHING`,
        [input.organizationId, name, position, ["Converted", "Not a Fit", "Won", "Enrolled"].includes(name)],
      );
    }
    await client.query(
      `INSERT INTO public.onboarding_progress (organization_id, completed_steps, current_step, completed_at)
       VALUES ($1, ARRAY['business_profile','industry_template','pipeline'], 'dashboard', now())
       ON CONFLICT (organization_id) DO UPDATE
       SET completed_steps = ARRAY['business_profile','industry_template','pipeline'],
           current_step = 'dashboard', completed_at = now(), updated_at = now()`,
      [input.organizationId],
    );
    await client.query(
      `INSERT INTO public.organisation_audit_logs (organization_id, actor_user_id, action, entity_type, details)
       VALUES ($1, $2, 'workspace.provisioned', 'business_profile', $3::jsonb)`,
      [input.organizationId, input.userId, JSON.stringify({ industryTemplateId: input.industryTemplateId })],
    );
    return { organizationId: input.organizationId, stagesCreated: stages.length };
  });
}
