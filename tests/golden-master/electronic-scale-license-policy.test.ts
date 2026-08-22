import assert from "node:assert/strict";
import test from "node:test";
import {
  electronicScaleLicenseFlagsFromEnvironment,
  electronicScaleRestriction,
  isElectronicScaleLicensed,
  unconfirmedElectronicScaleRestrictions,
} from "../../src/domain/clinical-config/electronic-scale-license-policy.ts";

test("licenças eletrônicas são fail-closed por padrão", () => {
  const flags = electronicScaleLicenseFlagsFromEnvironment({});
  assert.deepEqual(flags, {
    mnaEhrConfirmed: false,
    mmseElectronicConfirmed: false,
    mocaElectronicConfirmed: false,
  });
  assert.equal(isElectronicScaleLicensed("mna_full", flags), false);
  assert.equal(isElectronicScaleLicensed("meem_freitas", flags), false);
  assert.equal(isElectronicScaleLicensed("moca_br_freitas", flags), false);
  assert.equal(unconfirmedElectronicScaleRestrictions(flags).length, 3);
});

test("instrumentos sem reprodução eletrônica explícita continuam disponíveis", () => {
  const flags = electronicScaleLicenseFlagsFromEnvironment({});
  for (const code of ["katz", "lawton", "gds15", "pfeffer10", "minicog_freitas", "cesd_br_elderly", "zarit_br_22", "isi"]) {
    assert.equal(isElectronicScaleLicensed(code, flags), true, code);
    assert.equal(electronicScaleRestriction(code, flags), null);
  }
});

test("cada autorização precisa ser confirmada individualmente", () => {
  const flags = electronicScaleLicenseFlagsFromEnvironment({
    CLINICAL_LICENSE_MNA_EHR_CONFIRMED: "true",
    CLINICAL_LICENSE_MMSE_ELECTRONIC_CONFIRMED: "FALSE",
    CLINICAL_LICENSE_MOCA_ELECTRONIC_CONFIRMED: " True ",
  });
  assert.equal(isElectronicScaleLicensed("mna_full", flags), true);
  assert.equal(isElectronicScaleLicensed("moca_br_freitas", flags), true);
  assert.equal(isElectronicScaleLicensed("meem_freitas", flags), false);
  assert.deepEqual(unconfirmedElectronicScaleRestrictions(flags).map((item) => item.code), ["meem_freitas"]);
});

test("ISI score-only não é confundida com autorização para reproduzir o formulário", () => {
  const flags = electronicScaleLicenseFlagsFromEnvironment({});
  assert.equal(electronicScaleRestriction("isi", flags), null);
  assert.equal(isElectronicScaleLicensed("isi", flags), true);
});
