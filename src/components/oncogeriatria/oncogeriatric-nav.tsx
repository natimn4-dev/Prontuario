const links = [
  ["Visão geral", ""],
  ["1. Antes do tratamento", "/basal"],
  ["2. Tratamento oncológico", "/tratamento"],
  ["3. Durante o tratamento", "/check"],
  ["4. Plano geriátrico", "/intervencoes"],
  ["5. Escalas clínicas", "/escalas"],
  ["6. Evolução longitudinal", "/longitudinal"],
  ["7. Pós-tratamento", "/pos-tratamento"],
  ["8. Relatório", "/relatorio"],
] as const;

export function OncogeriatricNav({ patientId, episodeId }: { patientId: string; episodeId?: string | null }) {
  const suffix = episodeId ? `?episode=${encodeURIComponent(episodeId)}` : "";
  return (
    <nav className="panel" aria-label="Etapas do acompanhamento oncogeriátrico">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Fluxo clínico</p>
          <h2>Acompanhamento em etapas</h2>
        </div>
        <span className="muted">Use somente as etapas necessárias para esta paciente.</span>
      </div>
      <p className="muted">A ordem acompanha a prática clínica: avaliação inicial, tratamento, reavaliações, intervenções, escalas, evolução e relatório. Nenhuma escala é escolhida ou preenchida automaticamente.</p>
      <div className="program55-nav">
        {links.map(([label, path]) => (
          <a key={label} href={`/patients/${patientId}/oncogeriatria${path}${suffix}`}>{label}</a>
        ))}
      </div>
    </nav>
  );
}
