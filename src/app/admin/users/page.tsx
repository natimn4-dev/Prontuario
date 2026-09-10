import { UserManagementPanel } from "@/components/admin/user-management-panel";
import { requireAuthenticatedUser } from "@/server/auth/require-user";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  await requireAuthenticatedUser("user.manage");

  return (
    <main className="shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Administração segura</p>
        <h1>Gestão de usuários</h1>
        <p>Cadastre profissionais, defina o escopo de acesso e vincule pacientes sem apagar autoria ou histórico clínico.</p>
        <p><a href="/">← Voltar ao prontuário</a></p>
      </header>
      <UserManagementPanel />
    </main>
  );
}
