import { OncogeriatricNav } from "@/components/oncogeriatria/oncogeriatric-nav";
import { CONSULTATION_STATUS_LABELS, type ConsultationContextStatus } from "@/domain/consultation-context";
import { formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

function consultationStatusLabel(value: string): string {
  return CONSULTATION_STATUS_LABELS[value as ConsultationContextStatus] ?? "Situação não informada";
}

export default async function OncogeriatricScalesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de organizar as escalas.</p></main>;

  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  const linkedIds = new Set(workspace.checkpoints.flatMap((item) => item.consultationId ? [item.consultationId] : []));
  const ordered = [...workspace.consultations].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const linked = ordered.filter((item) => linkedIds.has(item.id));
  const available = ordered.filter((item) => !linkedIds.has(item.id));

  const consultationList = (items: typeof ordered, linkedToEpisode: boolean) => (
    <ul className="clean-list">
      {items.map((consultation) => (
        <li key={consultation.id}>
          <a href={`/consultations/${consultation.id}#escalas`}><strong>{formatClinicalDate(consultation.occurredAt)} · {consultationStatusLabel(consultation.status)}</strong></a>
          <span>{linkedToEpisode ? "Consulta vinculada: os resultados elegíveis integram a trajetória oncogeriátrica." : "Consulta ainda não vinculada: é possível preencher as escalas, mas elas só entram na trajetória oncogeriátrica após o vínculo explícito."}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Oncogeriatria · escalas clínicas</p>
        <h1>Aplicar e revisar escalas</h1>
        <p>{patient.fullName}. Esta etapa abre o mesmo sistema de escalas do prontuário geriátrico geral, evitando duplicidade de dados, resultados divergentes ou instrumentos paralelos.</p>
      </header>

      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />

      <section className="notice">
        <strong>Como funciona</strong>
        <span>Escolha uma consulta abaixo e abra “Escalas clínicas”. O geriatra continua decidindo quais instrumentos aplicar. Nenhuma escala é selecionada, preenchida ou interpretada automaticamente por causa do diagnóstico oncológico.</span>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div><p className="eyebrow">Prioridade</p><h2>Consultas vinculadas a este acompanhamento</h2></div>
          <span className="muted">Resultados dessas consultas podem compor a trajetória oncogeriátrica.</span>
        </div>
        {linked.length ? consultationList(linked, true) : <p className="muted">Ainda não existe consulta vinculada. Faça o vínculo na etapa “Antes do tratamento” ou “Durante o tratamento”.</p>}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div><p className="eyebrow">Outras consultas</p><h2>Consultas disponíveis para preenchimento</h2></div>
          <a href={`/patients/${patientId}`}>Voltar ao cadastro do paciente</a>
        </div>
        {available.length ? consultationList(available, false) : <p className="muted">Não há outras consultas disponíveis neste cadastro.</p>}
      </section>

      <section className="two-columns">
        <article className="panel">
          <h2>G8</h2>
          <p>A triagem G8 específica da oncogeriatria permanece na etapa “Antes do tratamento”, vinculada a uma consulta existente para usar o sistema único de escalas.</p>
          <a href={`/patients/${patientId}/oncogeriatria/basal?episode=${encodeURIComponent(episode.id)}`}>Ir para a avaliação antes do tratamento →</a>
        </article>
        <article className="panel">
          <h2>CARG</h2>
          <p className="clinical-caution">A implementação eletrônica local permanece bloqueada até a liberação formal das condições de uso. O bloqueio não impede o uso das demais escalas clínicas.</p>
        </article>
      </section>
    </main>
  );
}
