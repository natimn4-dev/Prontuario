import type { CapacityDimensionHistory } from "@/domain/capacity-dimension-history";
import { latestOncogeriatricDomainStates } from "@/domain/oncogeriatria/capacity-history";

function displayDate(value: string | null): string {
  if (!value) return "Sem avaliação vinculada";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function OncogeriatricDomainStatusSummary({ history }: { history: CapacityDimensionHistory }) {
  const states = latestOncogeriatricDomainStates(history);
  const evaluated = states.filter((item) => item.occurredAt !== null);

  return (
    <section className="panel" aria-label="Avaliação geriátrica persistente por domínio">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Acompanhamento longitudinal</p>
          <h2>Avaliação geriátrica por domínio</h2>
        </div>
        <span className="muted">Mesmo sistema de avaliação do prontuário geriátrico geral</span>
      </div>
      <p className="muted">
        Entram nesta visão apenas consultas explicitamente vinculadas a avaliações deste acompanhamento oncogeriátrico. Uma consulta posterior sem reaplicação não apaga o último estado registrado do domínio.
      </p>
      {evaluated.length ? (
        <div className="evolution-list">
          {states.map((item) => (
            <article className="evolution-card" key={item.code}>
              <div>
                <h3>{item.label}</h3>
                <p className="dimension">Última avaliação: {displayDate(item.occurredAt)}</p>
                <p className="trend">{item.statusLabel}</p>
                <p className="muted">{item.statusReason}</p>
              </div>
              <div className="score-block">
                <span>Instrumentos</span>
                <strong>{item.instruments.length ? item.instruments.map((instrument) => instrument.name).join(" · ") : "—"}</strong>
              </div>
              <div className="score-block">
                <span>Resultados</span>
                <strong>{item.instruments.length ? item.instruments.map((instrument) => instrument.score ?? instrument.classification ?? "registrado").join(" · ") : "—"}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhuma escala mapeada por domínio foi registrada em consulta vinculada a este acompanhamento.</p>
      )}
    </section>
  );
}
