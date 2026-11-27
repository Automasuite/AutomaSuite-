import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { completeWorkspaceSetup, createWorkspace } from "./actions";

export const dynamic = "force-dynamic";

const industries = [
  { id: "real_estate", name: "Real Estate", detail: "Property enquiries, buyer qualification and inspections" },
  { id: "retail_trading", name: "Retail & Trading", detail: "Product enquiries, orders and customer follow-up" },
  { id: "professional_services", name: "Professional Services", detail: "Consultations, proposals and client onboarding" },
  { id: "construction", name: "Construction & Development", detail: "Project enquiries, quotations and client relationships" },
  { id: "education_training", name: "Education & Training", detail: "Course enquiries, learner qualification and enrolment" },
];

export default async function OnboardingPage() {
  const { data } = await auth.getSession();
  if (!data?.user) redirect("/auth/sign-in");

  const { data: organizations } = await auth.organization.list();
  const existingOrganization = organizations?.[0] as { id?: string; name?: string } | undefined;

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <div className="onboarding-brand"><span className="onboarding-mark">A</span><span>AutomaSuite <b>Growth Engine</b></span></div>
        <p className="onboarding-kicker">YOUR BUSINESS WORKSPACE</p>
        <h1>Let’s set up your business.</h1>
        <p className="onboarding-intro">Create your workspace and choose the industry template that best describes your business. You can customise the setup later.</p>
        {existingOrganization?.id ? (
          <>
            <div className="onboarding-recovery"><b>{existingOrganization.name}</b><p>Your workspace account exists. Finish configuring its business profile and pipeline.</p></div>
            <form action={completeWorkspaceSetup} className="onboarding-form">
              <label htmlFor="industry">Choose your industry</label>
              <div className="industry-options">
                {industries.map((industry, index) => (
                  <label className="industry-option" key={industry.id}>
                    <input type="radio" name="industry" value={industry.id} required defaultChecked={index === 0} />
                    <span><b>{industry.name}</b><small>{industry.detail}</small></span>
                  </label>
                ))}
              </div>
              <button className="onboarding-submit" type="submit">Complete workspace setup <span>→</span></button>
            </form>
          </>
        ) : (
        <form action={createWorkspace} className="onboarding-form">
          <label htmlFor="businessName">Business or workspace name</label>
          <input id="businessName" name="businessName" required minLength={2} maxLength={80} placeholder="e.g. Acme Services" />
          <label htmlFor="industry">Choose your industry</label>
          <div className="industry-options">
            {industries.map((industry, index) => (
              <label className="industry-option" key={industry.id}>
                <input type="radio" name="industry" value={industry.id} required defaultChecked={index === 0} />
                <span><b>{industry.name}</b><small>{industry.detail}</small></span>
              </label>
            ))}
          </div>
          <button className="onboarding-submit" type="submit">Create business workspace <span>→</span></button>
        </form>
        <p className="onboarding-footnote">Your workspace is private to its authorised members.</p>
      </section>
    </main>
  );
}
