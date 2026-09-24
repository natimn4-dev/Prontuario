import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildOncogeriatricCargHref,
  buildOncogeriatricConsultationHref,
  buildOncogeriatricReturnPath,
  oncogeriatricReturnLabel,
  parseOncogeriatricReturnStage,
} from "../../src/domain/oncogeriatria/return-navigation.ts";

test("momento clínico mantém IDs explícitos no endereço canônico", () => {
  assert.equal(buildOncogeriatricCargHref({ patientId: "A/1", episodeId: "E?2", checkpointId: "C#3", consultationId: "Q 4" }),
    "/patients/A%2F1/oncogeriatria/avaliacao?episode=E%3F2&checkpoint=C%233&consultation=Q+4");
  assert.equal(buildOncogeriatricCargHref({ patientId: "A/1", episodeId: "E?2" }),
    "/patients/A%2F1/oncogeriatria/avaliacao?episode=E%3F2");
});

test("atalho para consulta preserva seção, episódio e etapa de origem", () => {
  assert.equal(
    buildOncogeriatricConsultationHref({
      consultationId: "consulta 1",
      section: "medicamentos",
      episodeId: "episódio/1",
      returnStage: "basal",
    }),
    "/consultations/consulta%201?oncogeriatriaReturn=basal&episode=epis%C3%B3dio%2F1#medicamentos",
  );
  assert.equal(
    buildOncogeriatricReturnPath({ patientId: "paciente 1", episodeId: "episódio/1", stage: "basal" }),
    "/patients/paciente%201/oncogeriatria/basal?episode=epis%C3%B3dio%2F1",
  );
  assert.equal(oncogeriatricReturnLabel("basal"), "Antes do tratamento");
});

test("etapa de retorno aceita somente destinos oncogeriátricos conhecidos", () => {
  assert.equal(parseOncogeriatricReturnStage("check"), "check");
  assert.equal(parseOncogeriatricReturnStage("https://exemplo.test"), null);
  assert.equal(parseOncogeriatricReturnStage(["basal"]), null);
  assert.equal(parseOncogeriatricReturnStage(undefined), null);
});

test("consulta valida vínculo do episódio ao paciente e oferece retorno no início e no fim", () => {
  const page = readFileSync("src/app/consultations/[id]/page.tsx", "utf8");
  const workspace = readFileSync("src/components/consultations/consultation-workspace.tsx", "utf8");
  const styles = readFileSync("src/components/consultations/consultation-workspace.module.css", "utf8");

  assert.match(page, /parseOncogeriatricReturnStage/);
  assert.match(page, /where: \{ id: episodeId, patientId: context\.patientId \}/);
  assert.match(page, /returnContext=\{returnContext\}/);
  assert.match(workspace, /aria-label="Retorno à etapa de origem"/);
  assert.match(workspace, /aria-label="Concluir e retornar à etapa de origem"/);
  assert.equal(workspace.match(/← Retornar para \{returnContext\.label\}/g)?.length, 2);
  assert.match(styles, /\.returnFooter/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.returnBar,[\s\S]*\.returnFooter/);
  assert.match(styles, /@media print[\s\S]*\.returnBar,[\s\S]*\.returnFooter/);
});

test("atalho de escalas abre a consulta mesmo sem checkpoint e CARG mantém avaliação canônica", () => {
  const continuity = readFileSync("src/components/oncogeriatria/clinical-continuity.tsx", "utf8");
  assert.match(continuity, /buildOncogeriatricCargHref/);
  assert.match(continuity, /buildOncogeriatricConsultationHref/);
  assert.match(continuity, /section: action.hash/);
  assert.match(continuity, /section: "escalas"/);
  assert.equal(buildOncogeriatricConsultationHref({ consultationId: "Q1", section: "escalas", episodeId: "E1", returnStage: "tratamento" }),
    "/consultations/Q1?oncogeriatriaReturn=tratamento&episode=E1#escalas");
  assert.match(continuity, /returnStage: OncogeriatricReturnStage/);
  const assessment = readFileSync("src/app/patients/[id]/oncogeriatria/avaliacao/page.tsx", "utf8");
  assert.match(assessment, /stage: "longitudinal"/);
});
