import { PatientFinder } from "@/components/patients/patient-finder";
import { isOncogeriatriaEnabled } from "@/domain/oncogeriatria/feature";
import { buildProfessionalIdentity } from "@/domain/professional-identity";
import { isProgram55Enabled } from "@/domain/program55/feature";
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
  const { user } = await requireAuthenticatedUser("patient.read");
  const professionalIdentity = buildProfessionalIdentity({
    name: user.name,
    email: user.email,
    brandOwnerEmail: process.env.PROFESSIONAL_BRAND_OWNER_EMAIL,
  });
  const program55Enabled = isProgram55Enabled(process.env.PROGRAM55_EMERGENCY_DISABLED);
  const oncogeriatriaEnabled = isOncogeriatriaEnabled(process.env.ONCOGERIATRIA_EMERGENCY_DISABLED);
  const canManageUsers = user.role === "ADMIN" || user.canManageUsers;

  return (
    <main className="shell home-shell">
      <header className="hero home-hero">
        <div className="home-brand-row">
          {professionalIdentity.logoPath ? (
            <img className="home-brand-logo" src={professionalIdentity.logoPath} alt={professionalIdentity.logoAlt ?? professionalIdentity.displayName} />
          ) : (
            <div className="home-session-identity" aria-label="Profissional autenticado">
              <strong>{professionalIdentity.displayName}</strong>
              <span>{professionalIdentity.roleLabel}</span>
            </div>
          )}
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

      {canManageUsers ? (
        <section className="panel" aria-labelledby="user-management-entry-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Administração</p>
              <h2 id="user-management-entry-title">Gestão de usuários</h2>
              <p className="muted">Cadastre profissionais, defina permissões e vincule pacientes com rastreabilidade.</p>
            </div>
            <a href="/admin/users">Gerenciar usuários →</a>
          </div>
        </section>
      ) : null}

      {program55Enabled ? (
        <section className="panel" aria-labelledby="program55-entry-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Linha de cuidado dedicada</p>
              <h2 id="program55-entry-title">Programa 55+ · pacientes de 55 a 70 anos</h2>
              <p className="muted">Acesse a visão integrada e longitudinal sem criar cadastro paralelo.</p>
            </div>
            <a href="/programa-55">Abrir Programa 55+ →</a>
          </div>
        </section>
      ) : null}

      {oncogeriatriaEnabled ? (
        <section className="panel" aria-labelledby="oncogeriatria-entry-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Linha de cuidado dedicada</p>
              <h2 id="oncogeriatria-entry-title">Oncogeriatria</h2>
              <p className="muted">Linha de cuidado dedicada à avaliação geriátrica antes, durante e após o tratamento oncológico, integrada ao mesmo prontuário clínico.</p>
            </div>
            <a href="/oncogeriatria">Abrir Oncogeriatria →</a>
          </div>
        </section>
      ) : null}

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
