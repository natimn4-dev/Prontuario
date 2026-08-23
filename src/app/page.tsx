import { PatientFinder } from "@/components/patients/patient-finder";
import { requireAuthenticatedUser } from "@/server/auth/require-user";

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
  await requireAuthenticatedUser("patient.read");

  return (
    <main className="shell home-shell">
      <header className="hero home-hero">
        <div className="home-brand-row">
          <img className="home-brand-logo" src="/brand/natalia-mendes-logo.svg" alt="Natalia Mendes — Médica Geriatra" />
          <span className="home-product-badge">Prontuário Aprimorado</span>
        </div>
        <p className="eyebrow">Prática clínica · continuidade do cuidado</p>
        <h1>Consulta geriátrica, organizada do início ao relatório final.</h1>
        <p>
          Localize o paciente e continue o atendimento no mesmo workspace: AGA inicial, escalas,
          problemas, medicamentos, SOAP, revisão clínica e relatório para paciente e família.
        </p>
      </header>

      <PatientFinder />

      <section className="notice">
        <strong>Segurança por padrão</strong>
        <span>
          A seleção do paciente precede o fluxo clínico. Documentos permanecem vinculados
          à consulta correspondente, e sugestões automáticas dependem de revisão médica
          antes de impressão ou exportação.
        </span>
      </section>

      <section className="home-flow-section" aria-labelledby="home-flow-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fluxo do prontuário</p>
            <h2 id="home-flow-title">Todas as etapas no mesmo padrão visual</h2>
          </div>
          <span className="muted">Baixa carga cognitiva · navegação consistente</span>
        </div>
        <div className="grid" aria-label="Etapas do fluxo clínico">
          {modules.map(([title, description], index) => (
            <article className="card home-flow-card" key={title}>
              <span className="home-flow-number" aria-hidden="true">{index + 1}</span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="demo-link"><a href="/demo">Abrir demonstração longitudinal sintética →</a></p>
    </main>
  );
}
