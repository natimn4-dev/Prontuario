import { urinaryCatheterGuidance, type UrinaryCatheterContext, type UrinaryCatheterGuidance } from "./urinary-catheter-support.ts";
import { parsePlanNote } from "./consultation-note-contract.ts";
import { gastrostomyFamilyGuidance } from "./family-contextual-care.ts";
import { preventiveExamOrderLabel } from "./preventive-exam-orders.ts";
import {
  swallowingSupportGuidance,
  type SwallowingSupportContext,
} from "./swallowing-support.ts";

export interface ReportProblemInput {
  id: string;
  title: string;
}

export interface AgaReportClinicalConduct {
  problemId: string;
  problemTitle: string;
  actions: string[];
}

export interface AgaReportGastrostomyCare {
  practicalActions: string[];
  caregiverActions: string[];
  contactGuidance: string[];
}

export interface AgaReportSwallowingSupportCare {
  enteralRoute: boolean;
  enteralTube?: boolean;
  gastrostomy?: boolean;
  dysphagia?: boolean;
  speechTherapy?: boolean;
  practicalActions: string[];
  caregiverActions: string[];
  contactGuidance: string[];
}

export interface AgaReportCareSections {
  clinicalConducts: AgaReportClinicalConduct[];
  gastrostomyCare?: AgaReportGastrostomyCare;
  swallowingSupportCare?: AgaReportSwallowingSupportCare;
  urinaryCatheterCare?: UrinaryCatheterGuidance;
}

export function buildAgaReportCareSections(input: {
  gastrostomyPresent: boolean;
  swallowingSupport?: SwallowingSupportContext;
  urinaryCatheter?: UrinaryCatheterContext;
  savedPlan: unknown;
  problems: readonly ReportProblemInput[];
}): AgaReportCareSections {
  const problemById = new Map(input.problems.map((problem) => [problem.id, problem]));
  let parsedPlan: ReturnType<typeof parsePlanNote>;
  try {
    parsedPlan = parsePlanNote(input.savedPlan);
  } catch {
    parsedPlan = undefined;
  }

  const clinicalConducts = Object.entries(parsedPlan?.byProblem ?? {}).flatMap(([problemId, actions]) => {
    const problem = problemById.get(problemId);
    if (!problem) return [];
    const normalizedActions = [...new Set(actions.map((action) => action.trim()).filter(Boolean))];
    if (normalizedActions.length === 0) return [];
    return [{
      problemId,
      problemTitle: problem.title,
      actions: normalizedActions,
    }];
  });
  const preventiveExamOrders = parsedPlan?.preventiveExamOrders ?? [];
  if (preventiveExamOrders.length > 0) {
    clinicalConducts.push({
      problemId: "preventive-exam-orders",
      problemTitle: "Exames e rastreios solicitados",
      actions: preventiveExamOrders.map(preventiveExamOrderLabel),
    });
  }

  const gastrostomyPresent = input.gastrostomyPresent || Boolean(input.swallowingSupport?.gastrostomy);
  const gastrostomyGuidance = gastrostomyPresent ? gastrostomyFamilyGuidance() : undefined;
  const swallowingContext = input.swallowingSupport
    ? { ...input.swallowingSupport, gastrostomy: gastrostomyPresent }
    : gastrostomyPresent ? { dysphagia: false, adaptedDiet: false, enteralTube: false, gastrostomy: true } : undefined;
  const swallowingGuidance = swallowingContext
    ? swallowingSupportGuidance(swallowingContext, {
        // The dedicated GTT section owns diet/medication/stoma care; avoid duplication.
        includeEnteralCare: !gastrostomyPresent || swallowingContext.enteralTube,
      })
    : undefined;

  const urinaryGuidance = urinaryCatheterGuidance(input.urinaryCatheter);
  return {
    clinicalConducts,
    ...(urinaryGuidance ? { urinaryCatheterCare: urinaryGuidance } : {}),
    ...(gastrostomyGuidance ? {
      gastrostomyCare: {
        practicalActions: [...gastrostomyGuidance.now],
        caregiverActions: [...gastrostomyGuidance.caregiver],
        contactGuidance: [...gastrostomyGuidance.contact],
      },
    } : {}),
    ...(swallowingGuidance ? { swallowingSupportCare: swallowingGuidance } : {}),
  };
}
