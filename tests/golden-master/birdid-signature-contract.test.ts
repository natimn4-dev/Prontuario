import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildBirdAuthorizationUrl,
  buildBirdCessSignatureRequest,
  buildBirdVcSchema,
  createBirdPkcePair,
  getBirdConfig,
} from "../../src/server/signatures/bird-client.ts";
import { routeAccessFor } from "../../src/domain/security/route-access.ts";

const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
const vidaasService = readFileSync(new URL("../../src/server/signatures/digital-signature-service.ts", import.meta.url), "utf8");
const birdService = readFileSync(new URL("../../src/server/signatures/bird-signature-service.ts", import.meta.url), "utf8");
const panel = readFileSync(new URL("../../src/components/reports/vidaas-signature-panel.tsx", import.meta.url), "utf8");
const vidaasClient = readFileSync(new URL("../../src/server/signatures/vidaas-client.ts", import.meta.url), "utf8");
const vidaasCallback = readFileSync(new URL("../../src/app/api/signatures/vidaas/callback/route.ts", import.meta.url), "utf8");
const birdCallback = readFileSync(new URL("../../src/app/api/signatures/bird/callback/route.ts", import.meta.url), "utf8");
const birdAgaRoute = readFileSync(new URL("../../src/app/api/consultations/[id]/reports/aga/signatures/bird/route.ts", import.meta.url), "utf8");
const birdDirectivesRoute = readFileSync(new URL("../../src/app/api/consultations/[id]/reports/advance-directives/signatures/bird/route.ts", import.meta.url), "utf8");

test("persistência continua multi-provedor sem migração clínica destrutiva", () => {
  const digitalSignatureModel = schema.match(/model DigitalSignature \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(digitalSignatureModel, /provider\s+String/);
  assert.doesNotMatch(digitalSignatureModel, /enum\s+DigitalSignatureProvider/);
  assert.match(vidaasService, /provider: "VIDAAS"/);
  assert.match(birdService, /provider: "BIRD"/);
});

test("VIDaaS permanece disponível e Bird é uma segunda opção explícita", () => {
  assert.match(panel, /VIDaaS/);
  assert.match(panel, /Bird ID/);
  assert.match(panel, /reports\/advance-directives\/signatures\/vidaas/);
  assert.match(panel, /reports\/advance-directives\/signatures\/bird/);
  assert.match(panel, /Confirmo a revisão clínica final do relatório/);
  assert.match(panel, /Confirmo a revisão final das diretivas antecipadas/);
  assert.match(panel, /Assinar \$\{documentLabel\} com VIDaaS/);
  assert.match(panel, /Assinar \$\{documentLabel\} com Bird ID/);
  assert.match(vidaasClient, /PAdES_AD_RB/);
  assert.match(vidaasCallback, /completeAgaVidaasSignature/);
});

test("Bird usa OAuth Authorization Code com PKCE e escopo de assinatura única", () => {
  const pair = createBirdPkcePair();
  assert.ok(pair.verifier.length >= 43);
  assert.match(pair.verifier, /^[A-Za-z0-9_-]+$/);
  const url = new URL(buildBirdAuthorizationUrl({
    config: {
      apiBaseUrl: "https://apihom.birdid.com.br",
      cessBaseUrl: "https://cess.lab.vaultid.com.br",
      clientId: "client-test",
      clientSecret: "server-only",
      cloudId: "SOLUTI",
      redirectUri: "https://prontuario.example.test/api/signatures/bird/callback",
      signaturePolicy: "AD_RB",
    },
    challenge: pair.challenge,
    state: "signature.random-state",
  }));
  assert.equal(url.pathname, "/v0/oauth/authorize");
  assert.equal(url.searchParams.get("scope"), "single_signature");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("redirect_uri"), "https://prontuario.example.test/api/signatures/bird/callback");
});

test("BirdID Pro recebe PDF como DATA_URL em PAdES e sem carimbo visual extra", () => {
  const pdf = Buffer.from("%PDF-1.7\n%%EOF\n", "ascii");
  const payload = buildBirdCessSignatureRequest({ documentId: "doc-1", pdf, policy: "AD_RB" });
  assert.equal(payload.type, "PAdEs");
  assert.equal(payload.policy, "AD_RB");
  assert.equal(payload.mode, "sync");
  assert.equal(payload.documents_source, "DATA_URL");
  assert.equal(payload.signature_settings[0]?.visible_signature, false);
  assert.equal(payload.documents[0]?.id, "doc-1");
  assert.match(payload.documents[0]?.data ?? "", /^data:application\/pdf;base64,/);
});

test("VCSchema do CESS é derivado somente do cloud id e token temporário", () => {
  assert.equal(buildBirdVcSchema("SOLUTI", "temporary-access-token"), Buffer.from("SOLUTI-|temporary-access-token").toString("base64"));
});

test("Bird falha fechado sem provisionamento externo e não expõe segredo no browser", () => {
  assert.throws(() => getBirdConfig({ APP_URL: "https://prontuario.example.test", NODE_ENV: "production" }), /BIRD_NOT_CONFIGURED/);
  assert.doesNotMatch(panel, /BIRD_CLIENT_SECRET|clientSecret|client_secret/);
  assert.match(birdAgaRoute, /BIRD_NOT_CONFIGURED/);
  assert.match(birdDirectivesRoute, /BIRD_NOT_CONFIGURED/);
});

test("rotas Bird são privadas como as rotas VIDaaS", () => {
  assert.equal(routeAccessFor({ pathname: "/api/signatures/bird/callback", authenticated: false }), "unauthorized-api");
  assert.equal(routeAccessFor({ pathname: "/api/consultations/id/reports/aga/signatures/bird", authenticated: false }), "unauthorized-api");
  assert.equal(routeAccessFor({ pathname: "/api/consultations/id/reports/advance-directives/signatures/bird", authenticated: false }), "unauthorized-api");
});

test("callback Bird preserva state, PKCE, documento e retorno para o relatório", () => {
  assert.match(birdCallback, /bird_pkce/);
  assert.match(birdCallback, /completeBirdSignature/);
  assert.match(birdCallback, /signedDocumentKind/);
  assert.match(birdCallback, /#relatorio/);
});
