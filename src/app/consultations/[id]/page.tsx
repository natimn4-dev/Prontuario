import { ConsultationFinalizationPanel } from "@/components/consultations/consultation-finalization-panel";
import { AgaReportPreview } from "@/components/reports/aga-report-preview";
import { OncogeriatricScales } from "@/components/scales/oncogeriatric-scales";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="shell consultation-shell">
      <header className="hero compact-hero clinical-hero">
        <p className="eyebrow">Consulta geriátrica longitudinal</p>
        <h1>Centro de cuidado e evolução</h1>
        <p>
          Registre avaliações, acompanhe mudanças desde a AGA inicial e gere um relatório
          compartilhável após revisão clínica.
        </p>
        <ol className="workflow-steps" aria-label="Etapas da consulta">
          <li><span>1</span>Avaliar</li>
          <li><span>2</span>Comparar</li>
          <li><span>3</span>Revisar</li>
          <li><span>4</span>Compartilhar</li>
        </ol>
      </header>

      <OncogeriatricScales consultationId={id} />

      <AgaReportPreview consultationId={id} />

      <ConsultationFinalizationPanel consultationId={id} />
    </main>
  );
}
