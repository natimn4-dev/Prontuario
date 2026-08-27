type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const hasError = Boolean(params?.error);

  return (
    <main
      className="shell"
      style={{
        width: "min(760px, calc(100% - 32px))",
        margin: "0 auto",
        padding: "56px 0 80px",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#2e2f30",
      }}
    >
      <section
        className="hero"
        aria-labelledby="login-title"
        style={{
          background: "#ffffff",
          border: "1px solid #e2d9da",
          borderRadius: 18,
          padding: 40,
        }}
      >
        <p
          className="eyebrow"
          style={{
            margin: "0 0 8px",
            color: "#896d72",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          Acesso restrito
        </p>
        <h1
          id="login-title"
          style={{
            margin: 0,
            color: "#896d72",
            fontSize: "clamp(34px, 5vw, 56px)",
            letterSpacing: "-.03em",
          }}
        >
          Prontuário Aprimorado
        </h1>
        <p style={{ maxWidth: 620, margin: "16px 0 24px", color: "#6e6264", fontSize: 18, lineHeight: 1.6 }}>
          Entre somente com uma conta Google previamente autorizada pela administração.
        </p>
        <a
          href="/auth/google"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            borderRadius: 8,
            background: "#896d72",
            color: "#ffffff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Entrar com Google
        </a>
        <p style={{ maxWidth: 620, margin: "16px 0 0", color: "#756a6c", fontSize: 14, lineHeight: 1.55 }}>
          Se o prontuário estiver aberto dentro de outro aplicativo, a próxima tela permitirá continuar manualmente com o Google ou abrir um novo contexto de navegador.
        </p>
        {hasError ? (
          <p role="alert" style={{ marginTop: 18, color: "#8f2727", fontWeight: 700 }}>
            Não foi possível iniciar a autenticação com o Google. Tente novamente.
          </p>
        ) : null}
      </section>
    </main>
  );
}
