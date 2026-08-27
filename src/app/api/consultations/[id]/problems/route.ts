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
  return handlers.GET(request, id);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return handlers.POST(request, id);
}
