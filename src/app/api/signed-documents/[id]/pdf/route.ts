import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { getSignedPdf } from "@/server/signatures/digital-signature-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAuthenticatedUser("patient.read");
  const { id } = await context.params;
  const document = await getSignedPdf(id);
  if (!document) return new Response("Documento assinado não encontrado.", { status: 404 });

  return new Response(new Uint8Array(document.pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="relatorio-aga-assinado-${document.id}.pdf"`,
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "x-document-sha256": document.sha256,
    },
  });
}
