export const WALKING_AID_CONTEXT_CODE = "walking_aid_context" as const;
export const WALKING_AID_CONTEXT_VERSION = "walking-aid-context-2026-09-v1" as const;

export const WALKING_AID_CONTEXT_DEFINITION = {
  code: WALKING_AID_CONTEXT_CODE,
  version: WALKING_AID_CONTEXT_VERSION,
  name: "Dispositivo de auxílio à locomoção",
  dimension: "mobilidade",
  instruction: "Registre se a pessoa utiliza dispositivo para locomoção. O tipo só será solicitado quando o uso estiver marcado.",
  sourceNote: "Registro clínico contextual do prontuário. Não é escala, não recebe ponto de corte e não altera isoladamente a classificação de locomoção/equilíbrio.",
  fields: [
    {
      id: "usesWalkingAid",
      label: "Utiliza dispositivo de auxílio à locomoção",
      display: "checkbox",
      choices: [
        { value: 0, label: "Não utiliza" },
        { value: 1, label: "Utiliza" },
      ],
    },
    {
      id: "walkingAidType",
      label: "Tipo de dispositivo",
      optional: true,
      showWhen: { fieldId: "usesWalkingAid", equals: 1 },
      choices: [
        { value: "Bengala", label: "Bengala" },
        { value: "Andador", label: "Andador" },
        { value: "Muletas", label: "Muletas" },
        { value: "Cadeira de rodas", label: "Cadeira de rodas" },
        { value: "Outro", label: "Outro" },
      ],
    },
  ],
} as const;

export function scoreWalkingAidContext(raw: Record<string, unknown>) {
  const allowed = new Set<string>(WALKING_AID_CONTEXT_DEFINITION.fields.map((field) => field.id));
  if (Object.keys(raw).some((id) => !allowed.has(id))) throw new Error("Dispositivo de locomoção contém campo não permitido.");

  const usesWalkingAid = raw.usesWalkingAid;
  if (usesWalkingAid !== 0 && usesWalkingAid !== 1) throw new Error("Informe se utiliza dispositivo de locomoção.");

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
  const allowedTypes = ["Bengala", "Andador", "Muletas", "Cadeira de rodas", "Outro"];
  if (typeof walkingAidType !== "string" || !allowedTypes.includes(walkingAidType)) {
    throw new Error("Selecione o tipo de dispositivo de locomoção utilizado.");
  }

  return {
    answers: { usesWalkingAid: 1, walkingAidType },
    result: {
      score: 1,
      scoreText: walkingAidType,
      classification: "Utiliza dispositivo de auxílio à locomoção",
      interpretation: "Registro contextual para individualizar orientações de segurança. O uso do dispositivo, isoladamente, não classifica o domínio de locomoção/equilíbrio.",
      clinicalColor: undefined,
    },
    version: WALKING_AID_CONTEXT_VERSION,
  };
}
