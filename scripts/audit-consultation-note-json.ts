import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import {
  classifyObjectiveNoteShape,
  classifyPlanNoteShape,
  classifySubjectiveNoteShape,
  type NoteSectionInventoryCounts,
} from "../src/domain/consultation-note-inventory.ts";

function requiredDatabaseUrl(): URL {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL não configurada.");
  const url = new URL(raw);
  if (url.protocol !== "mysql:") throw new Error("DATABASE_URL deve usar mysql://.");
  return url;
}

function databaseConfig(url: URL) {
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 2,
  };
}

function emptySection(): NoteSectionInventoryCounts {
  return { empty: 0, contractV1: 0, incompatible: 0 };
}

function increment(
  counts: NoteSectionInventoryCounts,
  status: "empty" | "contract-v1" | "incompatible",
): void {
  if (status === "empty") counts.empty += 1;
  else if (status === "contract-v1") counts.contractV1 += 1;
  else counts.incompatible += 1;
}

const url = requiredDatabaseUrl();
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseConfig(url)) });
const subjective = emptySection();
const objective = emptySection();
const plan = emptySection();
const assessment = { empty: 0, presentUnsupported: 0 };
let totalConsultations = 0;
let cursor: string | undefined;

try {
  while (true) {
    const rows = await prisma.consultation.findMany({
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
      },
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      increment(subjective, classifySubjectiveNoteShape(row.subjective));
      increment(objective, classifyObjectiveNoteShape(row.objective));
      increment(plan, classifyPlanNoteShape(row.plan));
      if (row.assessment === null) assessment.empty += 1;
      else assessment.presentUnsupported += 1;
      totalConsultations += 1;
    }

    cursor = rows.at(-1)?.id;
  }

  const safeToEnableV1ReadPath =
    subjective.incompatible === 0
    && objective.incompatible === 0
    && plan.incompatible === 0
    && assessment.presentUnsupported === 0;

  console.log(JSON.stringify({
    format: "consultation-note-json-inventory-v1",
    generatedAt: new Date().toISOString(),
    totalConsultations,
    sections: {
      subjective,
      objective,
      plan,
      assessment,
    },
    safeToEnableV1ReadPath,
    privacy: "Somente contagens agregadas; nenhum nome, ID ou texto clínico é emitido.",
  }, null, 2));
} catch {
  console.error("Falha ao auditar os formatos JSON das consultas. Nenhum conteúdo clínico foi emitido.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
