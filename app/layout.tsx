import type { Metadata } from "next";
import { Providers } from "./providers";
import "@neondatabase/auth-ui/css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutomaSuite Growth Engine | Business Growth Workspace",
  description: "One intelligent system for enquiries, leads, customer intelligence and business operations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
