import type { ClinicalProblem } from "@/domain/problems";
import { splitProblems } from "@/domain/problems";

const STATUS_LABELS: Record<ClinicalProblem["status"], string> = {
  ACTIVE: "Ativo",
  STABLE: "Estável",
  MONITORING: "Em acompanhamento",
  RESOLVED: "Resolvido",
};

function ProblemList({ problems }: { problems: readonly ClinicalProblem[] }) {
  if (problems.length === 0) return <p className="muted">Sem problemas registrados.</p>;
  return (
    <ul className="problem-list">
      {problems.map((problem) => (
        <li key={problem.id}>
          <div className="problem-title-row">
            <strong>{problem.title}</strong>
            <span className={`problem-status status-${problem.status.toLowerCase()}`}>
              {STATUS_LABELS[problem.status]}
            </span>
          </div>
          {problem.description ? <p>{problem.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function ProblemColumns({ problems }: { problems: readonly ClinicalProblem[] }) {
  const grouped = splitProblems([...problems]);
  return (
    <section className="problem-columns" aria-label="Lista de problemas por domínio">
      <article className="panel problem-panel">
        <h3>Problemas clínicos</h3>
        <ProblemList problems={grouped.clinical} />
      </article>
      <article className="panel problem-panel">
        <h3>Problemas geriátricos</h3>
        <ProblemList problems={grouped.geriatric} />
      </article>
    </section>
  );
}
