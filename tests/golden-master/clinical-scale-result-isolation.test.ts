import assert from "node:assert/strict";
import test from "node:test";
import {
  type ScopedWorkspaceValue,
  visibleWorkspaceValue,
} from "../../src/components/scales/scoped-workspace-state.ts";

test("resultado assíncrono permanece isolado na escala que originou o salvamento", () => {
  const frailResult: ScopedWorkspaceValue<{ score: number; classification: string }> = {
    scopeKey: "complementary:frail_br",
    value: { score: 1, classification: "Idoso pré-frágil" },
  };

  assert.deepEqual(
    visibleWorkspaceValue(frailResult, "complementary:frail_br"),
    frailResult.value,
  );
  assert.equal(
    visibleWorkspaceValue(frailResult, "complementary:dez_cs"),
    null,
  );
});

test("mensagem global de carregamento continua visível sem escala ativa", () => {
  const loadError: ScopedWorkspaceValue<{ kind: string; text: string }> = {
    scopeKey: null,
    value: { kind: "error", text: "Falha ao carregar escalas." },
  };

  assert.deepEqual(
    visibleWorkspaceValue(loadError, "complementary:frail_br"),
    loadError.value,
  );
  assert.deepEqual(visibleWorkspaceValue(loadError, null), loadError.value);
});
