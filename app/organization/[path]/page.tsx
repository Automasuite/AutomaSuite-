import { OrganizationView } from "@neondatabase/auth-ui";
import { organizationViewPaths } from "@neondatabase/auth-ui/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(organizationViewPaths).map((path) => ({ path }));
}

export default async function OrganizationPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  return <main className="auth-shell"><OrganizationView path={path} /></main>;
}
