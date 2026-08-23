import { execFileSync } from "node:child_process";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import {
  auditPatientSearchIndex,
  backfillPatientSearchIndex,
} from "../src/server/patients/patient-search-index-audit.ts";

function databaseUrl(): URL {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL não configurada.");
  const url = new URL(value);
  if (url.protocol !== "mysql:") throw new Error("DATABASE_URL deve usar mysql://.");
  return url;
}

function clientFor(url: URL): PrismaClient {
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

function printAudit(prefix: string, audit: Awaited<ReturnType<typeof auditPatientSearchIndex>>) {
  console.log(prefix);
  console.log(`- pacientes: ${audit.totalPatients}`);
  console.log(`- normalizedFullName nulo: ${audit.nullNormalizedFullName}`);
  console.log(`- normalizedFullName vazio: ${audit.emptyNormalizedFullName}`);
  console.log(`- normalização divergente: ${audit.mismatchedNormalizedFullName}`);
  console.log(`- collation do banco: ${audit.databaseCollation ?? "indisponível"}`);
  console.log(`- Patient.fullName: ${audit.fullNameCollation ?? "indisponível"}`);
  console.log(`- Patient.normalizedFullName: ${audit.normalizedFullNameCollation ?? "indisponível"}`);
  console.log("- nenhum nome, identificador ou outro dado do paciente foi exibido");
}

const apply = process.argv.includes("--apply");
const failOnMismatch = process.argv.includes("--fail-on-mismatch");
const url = databaseUrl();
const client = clientFor(url);

try {
  const before = await auditPatientSearchIndex(client);
  printAudit("PATIENT_SEARCH_INDEX_AUDIT=BEFORE", before);

  const inconsistencies = before.nullNormalizedFullName
    + before.emptyNormalizedFullName
    + before.mismatchedNormalizedFullName;

  if (apply && inconsistencies > 0) {
    // O backfill só começa depois que a rotina de backup criptografado existente
    // termina com sucesso. Se o dump falhar, execFileSync interrompe o processo.
    execFileSync(process.execPath, ["scripts/backup-mysql.mjs"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    const updated = await backfillPatientSearchIndex(client);
    console.log(`PATIENT_SEARCH_INDEX_BACKFILL=UPDATED:${updated}`);
    const after = await auditPatientSearchIndex(client);
    printAudit("PATIENT_SEARCH_INDEX_AUDIT=AFTER", after);
    if (
      after.nullNormalizedFullName > 0
      || after.emptyNormalizedFullName > 0
      || after.mismatchedNormalizedFullName > 0
    ) {
      throw new Error("Backfill concluído com inconsistências remanescentes.");
    }
  } else if (apply) {
    console.log("PATIENT_SEARCH_INDEX_BACKFILL=NO_CHANGES");
  }

  if (failOnMismatch && inconsistencies > 0 && !apply) {
    process.exitCode = 2;
  }
} finally {
  await client.$disconnect();
}
