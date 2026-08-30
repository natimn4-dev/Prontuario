import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ADVANCE_DIRECTIVE_TOPIC_CODES,
  emptyAdvanceDirectiveDraft,
  emptyAdvanceDirectiveTopics,
  shouldCollectAdvanceDirectiveDetails,
} from "../../src/domain/advance-directives.ts";
import { parseAdvanceDirectiveSave } from "../../src/server/clinical/advance-directives-http.ts";

const source = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("conversa é voluntária e uma recusa não persiste detalhes enviados", () => {
  assert.equal(shouldCollectAdvanceDirectiveDetails("WANTS_TO_TALK"), true);
  assert.equal(shouldCollectAdvanceDirectiveDetails("PREFERS_LATER"), false);
  assert.equal(shouldCollectAdvanceDirectiveDetails("DECLINED"), false);

  const parsed = parseAdvanceDirectiveSave({
    expectedLatestVersion: 2,
    disposition: "DECLINED",
    participationMode: "PATIENT_DIRECT",
    trustedPersonName: "Não deve permanecer",
    whatMatters: "Não deve permanecer",
    priorities: ["STAY_CLOSE_TO_IMPORTANT_PEOPLE"],
    topics: emptyAdvanceDirectiveTopics(),
    documentStatus: "NOT_INFORMED",
    reviewTrigger: "WHEN_PERSON_WANTS_OR_CONDITION_CHANGES",
  });

  assert.deepEqual(parsed.draft, {
    disposition: "DECLINED",
    priorities: [],
    topics: emptyAdvanceDirectiveTopics(),
    documentStatus: "NOT_INFORMED",
    reviewTrigger: "WHEN_PERSON_WANTS_OR_CONDITION_CHANGES",
  });
});

test("payload aceita somente enums, temas e campos conhecidos", () => {
  const draft = emptyAdvanceDirectiveDraft();
  assert.equal(Object.keys(draft.topics).length, ADVANCE_DIRECTIVE_TOPIC_CODES.length);
  assert.throws(() => parseAdvanceDirectiveSave({ expectedLatestVersion: 0, ...draft, extra: "não" }), /campos não permitidos/);
  assert.throws(() => parseAdvanceDirectiveSave({ expectedLatestVersion: 0, ...draft, disposition: "FORCED" }), /inválido/);
  assert.throws(() => parseAdvanceDirectiveSave({ expectedLatestVersion: -1, ...draft }), /Versão esperada inválida/);
});

test("persistência é aditiva, isolada por paciente e auditada", async () => {
  const [schema, migration, service, context] = await Promise.all([
    source("prisma/schema.prisma"),
    source("prisma/migrations/20260830110000_advance_directive_records/migration.sql"),
    source("src/server/clinical/advance-directives.ts"),
    source("src/server/clinical/advance-directives-workspace-context.ts"),
  ]);

  assert.match(schema, /model AdvanceDirectiveRecord/);
  assert.match(schema, /@@unique\(\[consultationId, version\]\)/);
  assert.match(schema, /relation\(fields: \[consultationId, patientId\], references: \[id, patientId\]/);
  assert.match(migration, /CREATE TABLE `AdvanceDirectiveRecord`/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|TRUNCATE/i);
  assert.match(context, /where:\s*\{\s*patientId: consultation\.patientId/s);
  assert.match(service, /advanceDirectiveRecord\.create/);
  assert.doesNotMatch(service, /advanceDirectiveRecord\.update|advanceDirectiveRecord\.delete/);
  assert.match(service, /expectedLatestVersion/);
  assert.match(service, /isolationLevel: "Serializable"/);
  assert.match(service, /advance-directive\.record\.create/);
});

test("interface preserva escolha, revisão humana, histórico e bloqueio após finalização", async () => {
  const [workspace, component] = await Promise.all([
    source("src/components/consultations/consultation-workspace.tsx"),
    source("src/components/consultations/advance-directives-workspace.tsx"),
  ]);

  assert.ok(workspace.indexOf('id: "diretivas"') < workspace.indexOf('id: "relatorio"'));
  assert.match(component, /Conversa, não ordem médica automática/);
  assert.match(component, /não determina capacidade/i);
  assert.match(component, /Revisão humana obrigatória/);
  assert.match(component, /Registrar nova versão/);
  assert.match(component, /Histórico preservado/);
  assert.match(component, /expectedLatestVersion: workspace\.latestVersion/);
  assert.match(component, /workspace\?\.consultationStatus === "FINALIZED"/);
});
