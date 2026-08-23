import { PatientFinder } from "@/components/patients/patient-finder";
import { listRecentPatientsForSelection } from "@/server/patients/search-patients";

const modules = [
  ["Paciente", "Identidade segura, homônimos e continuidade longitudinal"],
  ["AGA inicial", "Linha de base clínica, funcional e geriátrica"],
  ["Escalas", "Avaliações aplicadas na própria consulta, com interpretação"],
  ["Problemas", "Problemas clínicos e geriátricos acompanhados ao longo do tempo"],
  ["Medicações", "Reconciliação por consulta e organização estruturada dos horários"],
  ["SOAP", "Registro técnico para revisão e cópia ao prontuário"],
  ["Revisão clínica", "Confirmação médica antes das saídas compartilháveis"],
  ["Relatório final", "Orientações acessíveis e tabela final de medicamentos"],
];

export default async function Home() {
  const recentPatients = await listRecentPatientsForSelection();

  return (
    <main className="shell home-shell">
      <header className="hero home-hero">
        <div>
          <p className="eyebrow">Prática clínica · continuidade do cuidado</p>
          <h1>Prontuário Aprimorado</h1>
          <p>
            Localize o paciente e continue diretamente no contexto clínico atual, com AGA,
            escalas, problemas, medicações, SOAP e relatório longitudinal no mesmo fluxo.
          </p>
        </div>
        <div className="home-flow" aria-label="Fluxo principal">
          <span>Paciente</span><span>Consulta</span><span>Avaliação</span><span>Documentos</span>
        </div>
      </header>

      <PatientFinder initialResults={recentPatients} />

      <section className="notice home-safety-note">
        <strong>Segurança por padrão</strong>
        <span>
          A seleção do paciente precede o fluxo clínico. Documentos permanecem vinculados
          à consulta correspondente, e sugestões automáticas dependem de revisão médica
          antes de impressão ou exportação.
        </span>
      </section>

      <section className="grid home-module-grid" aria-label="Etapas do fluxo clínico">
        {modules.map(([title, description]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <p className="demo-link"><a href="/demo">Abrir demonstração longitudinal sintética →</a></p>
    </main>
  );
}
