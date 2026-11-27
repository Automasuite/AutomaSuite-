"use server";

import { auth } from "@/lib/auth/server";
import { provisionBusinessWorkspace } from "@/lib/db/tenant-workspace";
import { redirect } from "next/navigation";

function makeSlug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export async function createWorkspace(formData: FormData) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const businessName = String(formData.get("businessName") ?? "").trim();
  const industry = String(formData.get("industry") ?? "");
  const allowedIndustries = new Set(["real_estate", "retail_trading", "professional_services", "construction", "education_training"]);

  if (businessName.length < 2 || businessName.length > 80 || !allowedIndustries.has(industry)) {
    redirect("/onboarding?error=invalid-input");
  }

  const slugBase = makeSlug(businessName) || "business";
  const slug = `${slugBase}-${session.user.id.slice(0, 8).toLowerCase()}`;
  const { data: created, error } = await auth.organization.create({ name: businessName, slug });
  if (error || !created || typeof (created as { id?: unknown }).id !== "string") {
    redirect("/onboarding?error=workspace-create-failed");
  }

  try {
    await provisionBusinessWorkspace({
      userId: session.user.id,
      organizationId: (created as { id: string }).id,
      businessName,
      industryTemplateId: industry,
    });
  } catch {
    // Keep the Auth organisation so a retry can safely provision its business profile.
    redirect("/onboarding?error=database-provisioning-failed");
  }

  redirect("/");
}
