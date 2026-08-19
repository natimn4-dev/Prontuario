import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIMARY_SCALE_SOURCE_LABEL,
  isPrimaryPdfScale,
  scaleSourcePolicy,
} from "../../src/domain/clinical-config/scale-source-policy.ts";
import { scaleCatalogEntry } from "../../src/domain/scale-catalog.ts";

test("Freitas e Py é autoridade principal para escalas cobertas", () => {
  assert.equal(isPrimaryPdfScale("katz"), true);
  assert.equal(isPrimaryPdfScale("lawton"), true);
  assert.equal(isPrimaryPdfScale("gds15"), true);
  assert.equal(scaleCatalogEntry("lawton").primarySourceAuthority, PRIMARY_SCALE_SOURCE_LABEL);
  assert.equal(scaleCatalogEntry("lawton").sourceMigrationStatus, "adopted");
});

test("versões divergentes não são promovidas silenciosamente", () => {
  assert.equal(scaleSourcePolicy("pfeffer").coverage, "different-version");
  assert.equal(scaleSourcePolicy("pfeffer").migrationStatus, "migration-required");
  assert.equal(scaleSourcePolicy("mna_sf").coverage, "different-version");
  assert.equal(scaleSourcePolicy("mna_sf").migrationStatus, "migration-required");
  assert.equal(scaleSourcePolicy("mna_full").coverage, "defines-instrument");
  assert.equal(scaleSourcePolicy("moca").migrationStatus, "migration-required");
  assert.equal(scaleSourcePolicy("sppb").migrationStatus, "migration-required");
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
