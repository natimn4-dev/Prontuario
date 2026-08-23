import type { Metadata } from "next";
import "./globals.css";
import "./clinical-report.css";
import "./report-branding.css";
import "./clinical-premium-overrides.css";
import "./home-premium.css";

export const metadata: Metadata = {
  title: "Prontuário Aprimorado",
  description: "Prontuário geriátrico longitudinal e Avaliação Geriátrica Ampla",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
