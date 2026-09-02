const items = [
  ["Resumo", ""],
  ["Composição corporal", "/composicao"],
  ["Equipe multiprofissional", "/equipe"],
  ["Metas", "/metas"],
  ["Longitudinal", "/longitudinal"],
  ["MAPA 55+", "/mapa"],
] as const;

export function Program55Nav({ patientId }: { patientId: string }) {
  const base = `/patients/${patientId}/programa-55`;
  return (
    <nav className="panel no-print" aria-label="Navegação do Programa 55+" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {items.map(([label, suffix]) => <a key={label} href={`${base}${suffix}`}>{label}</a>)}
      </div>
    </nav>
  );
}
