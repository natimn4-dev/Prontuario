import { notFound } from "next/navigation";
import { getPublicSignatureVerification } from "@/server/signatures/digital-signature-service";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
  if (!value) return "Não concluída";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bahia",
  }).format(value);
}

export default async function VerifySignedDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const verification = await getPublicSignatureVerification(token);
  if (!verification) notFound();

  const isSigned = verification.status === "SIGNED" && Boolean(verification.signedSha256);
  return (
    <main className="shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Verificação de documento</p>
        <h1>{isSigned ? "Assinatura digital registrada" : "Documento sem assinatura concluída"}</h1>
        <p>
          Esta página confirma somente a existência e a integridade técnica do artefato digital. Nenhum dado clínico do paciente é publicado aqui.
        </p>
      </header>

      <section className="panel" aria-label="Dados públicos de verificação">
        <dl>
          <div><dt>Referência do documento</dt><dd>{verification.documentReference}</dd></div>
          <div><dt>Provedor</dt><dd>{verification.provider}</dd></div>
          <div><dt>Formato</dt><dd>{verification.signatureFormat}</dd></div>
          <div><dt>Status</dt><dd>{isSigned ? "Assinado" : "Não concluído"}</dd></div>
          <div><dt>Data da assinatura</dt><dd>{formatDate(verification.signedAt)}</dd></div>
          {verification.signedSha256 ? (
            <div>
              <dt>SHA-256 do PDF assinado</dt>
              <dd><code>{verification.signedSha256}</code></dd>
            </div>
          ) : null}
        </dl>
        <p>
          Para uma verificação criptográfica completa, utilize o arquivo PDF digital assinado em um validador compatível com PAdES/ICP-Brasil. A impressão em papel é apenas a representação visual do documento digital.
        </p>
      </section>
    </main>
  );
}
