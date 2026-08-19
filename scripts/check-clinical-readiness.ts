import { execFileSync } from "node:child_process";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { validateProductionEnvironment } from "../src/domain/security/environment.ts";

function fail(messages: readonly string[]): never {
  console.error("CLINICAL_RELEASE=BLOCKED");
  for (const message of messages) console.error(`- ${message}`);
  process.exit(1);
}

function backupErrors(): string[] {
  const errors: string[] = [];
  const value = process.env.BACKUP_ENCRYPTION_KEY_B64;
  if (!value) {
    errors.push("BACKUP_ENCRYPTION_KEY_B64 é obrigatória para liberação clínica.");
  } else {
    try {
      const key = Buffer.from(value, "base64");
      if (key.length !== 32) errors.push("BACKUP_ENCRYPTION_KEY_B64 deve decodificar exatamente 32 bytes.");
    } catch {
      errors.push("BACKUP_ENCRYPTION_KEY_B64 inválida.");
    }
  }

  try {
    execFileSync(process.env.MYSQLDUMP_BIN ?? "mysqldump", ["--version"], { stdio: "ignore" });
  } catch {
    errors.push("mysqldump não está disponível no host; backup operacional não pode ser comprovado.");
  }
  return errors;
}

function prismaClient(databaseUrl: string): PrismaClient {
  const url = new URL(databaseUrl);
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 2,
    }),
  });
}

const environment = validateProductionEnvironment({
  nodeEnv: process.env.NODE_ENV,
  appUrl: process.env.APP_URL,
  databaseUrl: process.env.DATABASE_URL,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  allowedEmails: process.env.AUTH_ALLOWED_EMAILS,
  bootstrapAdminEmails: process.env.AUTH_BOOTSTRAP_ADMIN_EMAILS,
});

const errors = [...environment.errors];
if (process.env.NODE_ENV !== "production") errors.push("NODE_ENV deve ser production para liberação clínica.");
errors.push(...backupErrors());
if (errors.length > 0) fail(errors);

const databaseUrl = process.env.DATABASE_URL!;
const client = prismaClient(databaseUrl);
try {
  await client.$queryRawUnsafe("SELECT 1");
  const rows = await client.$queryRawUnsafe<Array<{ failed: bigint | number }>>(
    "SELECT COUNT(*) AS failed FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL",
  );
  const failed = Number(rows[0]?.failed ?? 0);
  if (failed > 0) fail(["Existem migrations Prisma incompletas no banco de produção."]);
} catch (error) {
  const safeMessage = error instanceof Error && /_prisma_migrations/.test(error.message)
    ? "Tabela de migrations Prisma não pôde ser validada. Execute prisma migrate deploy antes da liberação."
    : "Banco de produção indisponível ou sem permissão suficiente para o health check.";
  fail([safeMessage]);
} finally {
  await client.$disconnect();
}

console.log("CLINICAL_RELEASE=PRESTART_OK");
console.log("- configuração de produção validada");
console.log("- chave e ferramenta de backup presentes");
console.log("- banco acessível");
console.log("- migrations sem estado incompleto");
console.log("Nenhum segredo foi exibido.");
