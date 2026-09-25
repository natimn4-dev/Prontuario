export const WALKING_AID_CONTEXT_CODE = "walking_aid_context" as const;
export const WALKING_AID_CONTEXT_VERSION = "walking-aid-context-2026-09-v2" as const;

export const WALKING_AID_CONTEXT_DEFINITION = {
  code: WALKING_AID_CONTEXT_CODE,
  version: WALKING_AID_CONTEXT_VERSION,
  name: "Dispositivo ou ajuda para locomoção",
  dimension: "mobilidade",
  instruction: "Registre se a pessoa utiliza dispositivo ou ajuda de outra pessoa para se locomover. Quando houver apoio, informe o tipo e se ela permanece a maior parte do dia sentada ou deitada.",
  sourceNote: "Registro clínico contextual do prontuário. Não é escala e não recebe ponto de corte. O apoio registrado individualiza orientações; não deambulação ou permanência prolongada sentada/deitada podem ativar cuidados preventivos sem gerar diagnóstico automático.",
  fields: [
    {
      id: "usesWalkingAid",
      label: "Utiliza dispositivo ou ajuda de outra pessoa para locomoção",
      display: "checkbox",
      choices: [
        { value: 0, label: "Não utiliza" },
        { value: 1, label: "Utiliza" },
      ],
    },
    {
      id: "walkingAidType",
      label: "Tipo de apoio",
      optional: true,
      showWhen: { fieldId: "usesWalkingAid", equals: 1 },
      choices: [
        { value: "Bengala", label: "Bengala" },
        { value: "Andador", label: "Andador" },
        { value: "Muletas", label: "Muletas" },
        { value: "Cadeira de rodas", label: "Cadeira de rodas" },
        { value: "Ajuda de terceiros", label: "Caminha apenas com ajuda de outra pessoa" },
        { value: "Não deambula", label: "Não caminha" },
        { value: "Outro", label: "Outro" },
      ],
    },
    {
      id: "mostlySeatedOrLying",
      label: "Permanece a maior parte do dia sentada ou deitada",
      optional: true,
      display: "checkbox",
      showWhen: { fieldId: "usesWalkingAid", equals: 1 },
      choices: [
        { value: 0, label: "Não" },
        { value: 1, label: "Sim" },
      ],
    },
  ],
} as const;

export function scoreWalkingAidContext(raw: Record<string, unknown>) {
  const allowed = new Set<string>(WALKING_AID_CONTEXT_DEFINITION.fields.map((field) => field.id));
  if (Object.keys(raw).some((id) => !allowed.has(id))) throw new Error("Apoio para locomoção contém campo não permitido.");

  const usesWalkingAid = raw.usesWalkingAid;
  if (usesWalkingAid !== 0 && usesWalkingAid !== 1) throw new Error("Informe se utiliza dispositivo ou ajuda de outra pessoa para locomoção.");

  if (usesWalkingAid === 0) {
    return {
      answers: { usesWalkingAid: 0 },
      result: {
        score: 0,
        scoreText: "Não utiliza dispositivo de locomoção",
        classification: "Sem dispositivo de auxílio à locomoção registrado",
        interpretation: "Registro contextual. Nenhuma orientação sobre bengala, andador ou outro dispositivo deve ser gerada a partir deste campo.",
        clinicalColor: undefined,
      },
      version: WALKING_AID_CONTEXT_VERSION,
    };
  }

  const walkingAidType = raw.walkingAidType;
  const allowedTypes = ["Bengala", "Andador", "Muletas", "Cadeira de rodas", "Ajuda de terceiros", "Não deambula", "Outro"];
  if (typeof walkingAidType !== "string" || !allowedTypes.includes(walkingAidType)) {
    throw new Error("Selecione o tipo de apoio para locomoção utilizado.");
  }

  const mostlySeatedOrLying = raw.mostlySeatedOrLying;
  if (mostlySeatedOrLying !== undefined && mostlySeatedOrLying !== 0 && mostlySeatedOrLying !== 1) {
    throw new Error("Informe corretamente se a pessoa permanece a maior parte do dia sentada ou deitada.");
  }

  const classification = walkingAidType === "Ajuda de terceiros"
    ? "Caminha apenas com ajuda de outra pessoa"
    : walkingAidType === "Não deambula"
      ? "Não deambula"
      : "Utiliza dispositivo de auxílio à locomoção";

  return {
    answers: {
      usesWalkingAid: 1,
      walkingAidType,
      ...(mostlySeatedOrLying === undefined ? {} : { mostlySeatedOrLying }),
    },
    result: {
      score: 1,
      scoreText: walkingAidType,
      classification,
      interpretation: "Registro contextual para individualizar orientações de segurança, mobilidade assistida e prevenção de complicações relacionadas à baixa mobilidade.",
      clinicalColor: undefined,
    },
    version: WALKING_AID_CONTEXT_VERSION,
  };
}
