import { authErrorPresentation } from "@/domain/auth-error";

type AuthErrorPageProps = {
  searchParams?: Promise<{ error?: string; code?: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const presentation = authErrorPresentation(params?.error ?? params?.code);

  return (
    <main
      style={{
        width: "min(720px, calc(100% - 32px))",
        margin: "0 auto",
        padding: "56px 0 80px",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#2e2f30",
      }}
    >
      <section
        aria-labelledby="auth-error-title"
        style={{
          background: "#ffffff",
          border: "1px solid #e2d9da",
          borderRadius: 18,
          padding: 40,
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            color: "#896d72",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Acesso seguro
        </p>
        <h1
          id="auth-error-title"
          style={{ margin: 0, color: "#896d72", fontSize: "clamp(30px, 5vw, 46px)" }}
        >
          {presentation.title}
        </h1>
        <p role="alert" style={{ maxWidth: 620, margin: "16px 0 22px", color: "#5f5557", fontSize: 17, lineHeight: 1.6 }}>
          {presentation.message}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a
            href="/auth/google"
            style={{
              display: "inline-block",
              padding: "11px 17px",
              borderRadius: 8,
              background: "#5d237a",
              color: "#ffffff",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Tentar novamente com Google
          </a>
          {presentation.compatibleModeSuggested ? (
            <a
              href="/auth/google?manual=1"
              style={{
                display: "inline-block",
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #896d72",
                color: "#5d237a",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Usar modo compatível
            </a>
          ) : null}
        </div>

        <p style={{ margin: "24px 0 0", color: "#756a6c", fontSize: 14, lineHeight: 1.55 }}>
          Código para suporte: <strong>{presentation.diagnosticCode}</strong>
        </p>
        <p style={{ margin: "10px 0 0", color: "#756a6c", fontSize: 14, lineHeight: 1.55 }}>
          Este código não contém senha, token ou informação clínica.
        </p>
      </section>
    </main>
  );
}
