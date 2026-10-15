import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutomaSuite LeadGen Pro | Lead Generation & Growth",
  description: "Find the right leads, engage with purpose, and turn conversations into customers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
