import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIMARY_SCALE_SOURCE_LABEL,
  PRIMARY_SCALE_SOURCE_POLICY_VERSION,
  isPrimaryPdfScale,
  scaleSourcePolicy,
} from "../../src/domain/clinical-config/scale-source-policy.ts";
import { scaleCatalogEntry } from "../../src/domain/scale-catalog.ts";

const adoptedFreitasCodes = [
  "katz",
  "lawton",
  "gds15",
  "mna_full",
  "pfeffer10",
  "sppb_freitas",
  "poma_freitas",
  "minicog_freitas",
  "meem_freitas",
  "clock_shulman",
  "moca_br_freitas",
  "iqcode_br_26",
] as const;

test("Freitas e Py é autoridade principal para escalas cobertas", () => {
  assert.equal(PRIMARY_SCALE_SOURCE_POLICY_VERSION, "2026-08-19");
  assert.equal(isPrimaryPdfScale("katz"), true);
  assert.equal(isPrimaryPdfScale("lawton"), true);
  assert.equal(isPrimaryPdfScale("gds15"), true);
  assert.equal(scaleCatalogEntry("lawton").primarySourceAuthority, PRIMARY_SCALE_SOURCE_LABEL);
  assert.equal(scaleCatalogEntry("lawton").sourceMigrationStatus, "adopted");
});

test("versões Freitas/Py clinicamente expostas permanecem catalogadas como adotadas", () => {
  for (const code of adoptedFreitasCodes) {
    const policy = scaleSourcePolicy(code);
    assert.equal(isPrimaryPdfScale(code), true, code);
    assert.equal(policy.migrationStatus, "adopted", code);
    assert.notEqual(policy.coverage, "not-covered", code);
  }
});

test("versões divergentes não são promovidas silenciosamente", () => {
  assert.equal(scaleSourcePolicy("pfeffer").coverage, "different-version");
  assert.equal(scaleSourcePolicy("pfeffer").migrationStatus, "migration-required");
  assert.equal(scaleSourcePolicy("mna_sf").coverage, "different-version");
  assert.equal(scaleSourcePolicy("mna_sf").migrationStatus, "migration-required");
  assert.equal(scaleSourcePolicy("mna_full").coverage, "defines-instrument");
  assert.equal(scaleSourcePolicy("mna_full").migrationStatus, "adopted");
  assert.equal(scaleSourcePolicy("moca").migrationStatus, "migration-required");
  assert.equal(scaleSourcePolicy("sppb").migrationStatus, "migration-required");
  assert.equal(scaleSourcePolicy("minicog").migrationStatus, "migration-required");
  assert.equal(scaleSourcePolicy("poma").migrationStatus, "migration-required");
  assert.equal(scaleSourcePolicy("iqcode_br").migrationStatus, "migration-required");
});

test("instrumentos fora do PDF continuam explicitamente secundários", () => {
  assert.equal(isPrimaryPdfScale("g8"), false);
  assert.equal(scaleCatalogEntry("g8").primarySourceCoverage, "not-covered");
  assert.equal(scaleCatalogEntry("g8").sourceMigrationStatus, "secondary-source");
});

test("instrumentos novos do PDF podem ser catalogados sem inventar regra clínica", () => {
  const minicog = scaleCatalogEntry("minicog");
  assert.equal(minicog.primarySourceAuthority, PRIMARY_SCALE_SOURCE_LABEL);
  assert.equal(minicog.primarySourceCoverage, "defines-instrument");
  assert.equal(minicog.sourceStatus, "needs-review");
  assert.equal(minicog.version, "unknown");

  const cesd = scaleCatalogEntry("cesd");
  assert.equal(cesd.primarySourceCoverage, "defines-form-only");
  assert.equal(cesd.sourceMigrationStatus, "review-required");
});

test("códigos ativos não caem no fallback de fonte secundária", () => {
  assert.equal(scaleSourcePolicy("pfeffer10").coverage, "defines-instrument");
  assert.equal(scaleSourcePolicy("sppb_freitas").coverage, "defines-instrument");
  assert.equal(scaleSourcePolicy("poma_freitas").coverage, "defines-instrument");
  assert.equal(scaleSourcePolicy("clock_shulman").coverage, "defines-form-only");
  assert.equal(scaleSourcePolicy("escala_inexistente").coverage, "not-covered");
  assert.equal(scaleSourcePolicy("escala_inexistente").migrationStatus, "secondary-source");
});
