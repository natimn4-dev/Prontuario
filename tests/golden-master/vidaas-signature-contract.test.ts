import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { routeAccessFor } from "../../src/domain/security/route-access.ts";
import { createValidationQrMatrix, validationQrLimits } from "../../src/server/signatures/validation-qr.ts";
import {
  buildVidaasAuthorizationUrl,
  createPkcePair,
  extractSignedPdfFromVidaasPayload,
} from "../../src/server/signatures/vidaas-client.ts";

const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
const service = readFileSync(new URL("../../src/server/signatures/digital-signature-service.ts", import.meta.url), "utf8");
const credentials = readFileSync(new URL("../../src/server/signatures/vidaas-credentials.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../../src/server/signatures/vidaas-client.ts", import.meta.url), "utf8");
const panel = readFileSync(new URL("../../src/components/reports/vidaas-signature-panel.tsx", import.meta.url), "utf8");
const pdfRenderer = readFileSync(new URL("../../src/server/signatures/report-pdf.ts", import.meta.url), "utf8");

test("VIDaaS usa OAuth PKCE single_signature com redirect registrado", () => {
  const pair = createPkcePair();
  assert.ok(pair.verifier.length >= 43);
  assert.match(pair.verifier, /^[A-Za-z0-9_-]+$/);
  assert.match(pair.challenge, /^[A-Za-z0-9_-]{43}$/);

  const url = new URL(buildVidaasAuthorizationUrl({
    config: {
      baseUrl: "https://hml-certificado.vidaas.com.br",
      clientId: "client-test",
      clientSecret: "server-only",
      redirectUri: "https://prontuario.example.test/api/signatures/vidaas/callback",
      signatureFormat: "PAdES_AD_RB",
    },
    challenge: pair.challenge,
    state: "signature.random-state",
  }));
  assert.equal(url.pathname, "/v0/oauth/authorize");
  assert.equal(url.searchParams.get("scope"), "single_signature");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("login_hint"), "");
  assert.equal(url.searchParams.get("redirect_uri"), "https://prontuario.example.test/api/signatures/vidaas/callback");
});

test("QR de validação é gerado localmente e comporta a URL tokenizada", () => {
  const token = "a".repeat(43);
  const url = `https://prontuario.example.test/verificar/${token}`;
  assert.ok(Buffer.byteLength(url, "utf8") <= validationQrLimits.maxPayloadBytes);
  const matrix = createValidationQrMatrix(url);
  assert.equal(matrix.length, 41);
  assert.ok(matrix.every((row) => row.length === 41));
  assert.equal(matrix[0][0], true);
  assert.equal(matrix[3][3], true);
  assert.equal(matrix[1][1], false);
});

test("somente a verificação tokenizada é pública; APIs e PDF permanecem protegidos", () => {
  assert.equal(routeAccessFor({ pathname: "/verificar/token", authenticated: false }), "public");
  assert.equal(routeAccessFor({ pathname: "/api/signed-documents/id/pdf", authenticated: false }), "unauthorized-api");
  assert.equal(routeAccessFor({ pathname: "/api/signatures/vidaas/callback", authenticated: false }), "unauthorized-api");
});

test("persistência da assinatura não possui biometria, senha, chave privada ou access token", () => {
  const digitalSignatureModel = schema.match(/model DigitalSignature \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(digitalSignatureModel, /signedPdfBase64/);
  assert.match(digitalSignatureModel, /verificationTokenHash/);
  assert.doesNotMatch(digitalSignatureModel, /biometr|fingerprint|password|senha|privateKey|accessToken/i);
  assert.match(service, /unsignedPdfBase64: null/);
});

test("credenciais VIDaaS podem ser bootstrapadas sem expor client_secret em texto claro no banco", () => {
  const integrationModel = schema.match(/model ExternalIntegrationCredential \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(integrationModel, /encryptedPayload/);
  assert.doesNotMatch(integrationModel, /clientSecret|client_secret|password|privateKey/i);
  assert.match(credentials, /createCipheriv\("aes-256-gcm"/);
  assert.match(credentials, /hkdfSync\("sha256"/);
  assert.match(credentials, /user\.role !== "ADMIN"/);
  assert.match(credentials, /integration\.vidaas\.bootstrap/);
  assert.match(client, /\/v0\/oauth\/application/);
  assert.match(client, /redirect_uris/);
  assert.match(client, /VIDAAS_PRODUCTION_BASE_URL/);
});

test("fluxo clínico exige revisão, finaliza e só então oferece impressão do PDF assinado", () => {
  assert.match(panel, /Confirmo a revisão clínica final/);
  assert.match(panel, /Finalizar e assinar com VIDaaS/);
  assert.match(panel, /disabled=\{!reviewConfirmed \|\| loading\}/);
  assert.match(panel, /Abrir \/ imprimir PDF assinado/);
  assert.match(pdfRenderer, /createValidationQrMatrix/);
  assert.match(pdfRenderer, /não contém dados clínicos/);
  assert.doesNotMatch(pdfRenderer, /googleapis|quickchart|api\.qrserver/i);
});

test("PDF destinado ao VIDaaS usa o relatório visual estruturado, não a exportação textual", () => {
  assert.match(service, /requireStructuredReport/);
  assert.doesNotMatch(service, /requireReportText/);
  assert.match(pdfRenderer, /buildReportDomainSummaries/);
  assert.match(pdfRenderer, /Evolução da capacidade e da independência funcional/);
  assert.match(pdfRenderer, /Plano de medicamentos - documento separado/);
  assert.doesNotMatch(pdfRenderer, /reportText/);
  assert.doesNotMatch(pdfRenderer, /TABELA FINAL DE MEDICAMENTOS/);
  assert.doesNotMatch(pdfRenderer, /medicationPlan\.plan/);
});

function vidaasPdfFixtures() {
  const unsignedPdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "ascii");
  const signedPdf = Buffer.from(
    "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n2 0 obj\n<< /Type /Sig /ByteRange [0 10 20 30] /Contents <AABB> >>\nendobj\n%%EOF\n",
    "ascii",
  );
  return { unsignedPdf, signedPdf };
}

test("extrator VIDaaS mantém compatibilidade quando raw_signature contém o PDF PAdES", () => {
  const { unsignedPdf, signedPdf } = vidaasPdfFixtures();
  const result = extractSignedPdfFromVidaasPayload({
    signatures: [{ id: "doc", raw_signature: signedPdf.toString("base64") }],
  }, unsignedPdf);
  assert.deepEqual(result, signedPdf);
});

test("extrator VIDaaS ignora assinatura criptográfica isolada e seleciona o PDF assinado retornado", () => {
  const { unsignedPdf, signedPdf } = vidaasPdfFixtures();
  const cryptographicSignature = Buffer.from([0x30, 0x82, 0x01, 0x00, 0x7f, 0x01]).toString("base64");
  const result = extractSignedPdfFromVidaasPayload({
    signatures: [{
      id: "doc",
      raw_signature: cryptographicSignature,
      signed_content: signedPdf.toString("base64"),
    }],
  }, unsignedPdf);
  assert.deepEqual(result, signedPdf);
});

test("extrator VIDaaS nunca aceita o PDF original ecoado como se estivesse assinado", () => {
  const { unsignedPdf } = vidaasPdfFixtures();
  assert.throws(() => extractSignedPdfFromVidaasPayload({
    signatures: [{
      id: "doc",
      raw_signature: Buffer.from("detached-signature", "utf8").toString("base64"),
      base64_content: unsignedPdf.toString("base64"),
    }],
  }, unsignedPdf), /VIDAAS_SIGNED_DOCUMENT_INVALID/);
});
