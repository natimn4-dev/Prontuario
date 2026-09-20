import { withClinicalPerformance } from "@/server/observability/clinical-performance";
import {
  changeProblemStatus,
  createProblem,
  deleteProblem,
  getProblemWorkspace,
} from "@/server/clinical/problem-workspace";
import { problemWorkspaceHttpHandlers } from "@/server/clinical/problem-workspace-http";

const handlers = problemWorkspaceHttpHandlers({
  getProblemWorkspace,
  createProblem,
  changeProblemStatus,
  deleteProblem,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withClinicalPerformance(request, "consultation.problems.read", () => handlers.GET(request, id));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withClinicalPerformance(request, "consultation.problems.write", () => handlers.POST(request, id));
}
