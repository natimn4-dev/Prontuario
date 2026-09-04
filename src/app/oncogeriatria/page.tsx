import { searchOncogeriatricPatientCandidates } from "@/server/oncogeriatria/patient-search";
import { requireOncogeriatricReadAccess, formatClinicalDate, hasRelevantCheckpointAlert } from "@/server/oncogeriatria/read";
import { prisma } from "@/server/db";

function phaseFor(checkpoints: { type: string; status: string; occurredAt: Date }[], courseStatus?: string | null): string {
  const latest = [...checkpoints].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
  if (!latest) return "PRE_TREATMENT";
  if (latest.type.startsWith("POST_")) return "FOLLOW_UP";
  if (latest.type === "END_OF_TREATMENT") return "POST_TREATMENT";
  if (latest.type === "PERIODIC_REASSESSMENT" || latest.type === "EVENT_DRIVEN") return "REASSESSMENT";
  if (courseStatus === "COMPLETED") return "POST_TREATMENT";
  if (courseStatus === "ACTIVE" || latest.type === "CYCLE") return "IN_TREATMENT";
  return "PRE_TREATMENT";
}

const phaseLabels: Record<string, string> = {
  PRE_TREATMENT: "Pré-tratamento",
  IN_TREATMENT: "Em tratamento",
  REASSESSMENT: "Reavaliação",
  POST_TREATMENT: "Pós-tratamento",
  FOLLOW_UP: "Seguimento",
  COMPLETED: "Acompanhamento concluído",
};

function formatIsoClinicalDate(value: string | null | undefined): string {
  if (!value) return "Sem dados registrados";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "Sem dados registrados";
}

export default async function OncogeriatriaHome({ searchParams }: { searchParams: Promise<{ q?: string; phase?: string }> }) {
  await requireOncogeriatricReadAccess();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const phaseFilter = (params.phase ?? "").trim();

  const episodes = await prisma.oncogeriatricEpisode.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
  const patientIds = [...new Set(episodes.map((item) => item.patientId))];
  const episodeIds = episodes.map((item) => item.id);
  const [patients, courses, checkpoints] = await Promise.all([
    patientIds.length ? prisma.patient.findMany({ where: { id: { in: patientIds } }, select: { id: true, fullName: true } }) : Promise.resolve([]),
    episodeIds.length ? prisma.oncogeriatricTreatmentCourse.findMany({ where: { episodeId: { in: episodeIds } }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    episodeIds.length ? prisma.oncogeriatricCheckpoint.findMany({ where: { episodeId: { in: episodeIds } }, orderBy: { occurredAt: "desc" } }) : Promise.resolve([]),
  ]);
  const patientMap = new Map(patients.map((patient) => [patient.id, patient]));

  const rows = episodes.map((episode) => {
    const episodeCourses = courses.filter((course) => course.episodeId === episode.id);
    const episodeCheckpoints = checkpoints.filter((checkpoint) => checkpoint.episodeId === episode.id);
    const currentCourse = episodeCourses.find((course) => course.status === "ACTIVE") ?? episodeCourses[0];
    const latest = episodeCheckpoints[0];
    const next = episodeCheckpoints
      .filter((checkpoint) => checkpoint.scheduledAt && checkpoint.scheduledAt.getTime() >= Date.now())
      .sort((a, b) => (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0))[0];
    const phase = episode.status === "COMPLETED" ? "COMPLETED" : phaseFor(episodeCheckpoints, currentCourse?.status);
    return {
      episode,
      patient: patientMap.get(episode.patientId),
      currentCourse,
      latest,
      next,
      phase,
      alert: episodeCheckpoints.some((checkpoint) => hasRelevantCheckpointAlert(checkpoint.structuredData)),
    };
  }).filter((row) => !phaseFilter || row.phase === phaseFilter);

  const searchPatients = q.length >= 2
    ? await searchOncogeriatricPatientCandidates(prisma, q)
    : [];

  return (
    <main className="shell home-shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Linha de cuidado dedicada</p>
        <h1>Oncogeriatria</h1>
        <p>Avaliação geriátrica antes, durante e após o tratamento oncológico, integrada ao mesmo prontuário e ao mesmo cadastro do paciente.</p>
      </header>

      <section className="notice">
        <strong>Inclusão médica explícita</strong>
        <span>Nenhum paciente é incluído automaticamente por idade. A busca abaixo apenas localiza o cadastro existente para que o médico decida iniciar — ou não — um acompanhamento oncogeriátrico.</span>
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Localizar paciente</p><h2>Iniciar ou retomar acompanhamento</h2></div><a href="/">Voltar à página inicial</a></div>
        <form method="get" className="compact-fields">
          <label>Nome do paciente<input name="q" defaultValue={q} placeholder="Digite pelo menos 2 caracteres" /></label>
          <label>Fase<select name="phase" defaultValue={phaseFilter}><option value="">Todas</option>{Object.entries(phaseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button type="submit">Filtrar</button>
        </form>
        {q.length >= 2 ? (
          <ul className="clean-list" aria-label="Resultados da busca de pacientes">
            {searchPatients.map((patient) => <li key={patient.id}><a href={`/patients/${patient.id}/oncogeriatria`}><strong>{patient.fullName}</strong></a><span>Nascimento: {formatIsoClinicalDate(patient.birthDate)} · abrir cadastro existente</span></li>)}
            {!searchPatients.length ? <li><span>Nenhum paciente encontrado com esse termo.</span></li> : null}
          </ul>
        ) : null}
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Em acompanhamento</p><h2>{rows.length} acompanhamento(s) oncogeriátrico(s)</h2></div><span className="muted">Máximo de 100 acompanhamentos recentes nesta visão</span></div>
        {rows.length ? <div className="evolution-list">{rows.map((row) => (
          <article className="evolution-card" key={row.episode.id}>
            <div>
              <h3><a href={`/patients/${row.episode.patientId}/oncogeriatria?episode=${row.episode.id}`}>{row.patient?.fullName ?? "Paciente"}</a></h3>
              <p className="dimension">{row.episode.primarySite ?? row.episode.diagnosis}</p>
              <p className="trend">{phaseLabels[row.phase] ?? "Fase não informada"}{row.alert ? " · mudança relevante registrada" : ""}</p>
            </div>
            <div className="score-block"><span>Tratamento</span><strong>{row.currentCourse?.regimenName ?? "—"}</strong></div>
            <div className="score-arrow" aria-hidden="true">→</div>
            <div className="score-block"><span>Última avaliação</span><strong>{row.latest ? formatClinicalDate(row.latest.occurredAt) : "—"}</strong></div>
            <div className="score-block"><span>Próxima avaliação</span><strong>{row.next?.scheduledAt ? formatClinicalDate(row.next.scheduledAt) : "—"}</strong></div>
          </article>
        ))}</div> : <p className="muted">Nenhum acompanhamento oncogeriátrico corresponde ao filtro atual.</p>}
      </section>
    </main>
  );
}
