import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseConfig } from "./database-config";
import { observePrismaQuery } from "./observability/clinical-performance";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(databaseConfig(process.env.DATABASE_URL)),
    log: [{ emit: "event", level: "query" }],
  });

const prismaQueryEvents = prisma as unknown as {
  $on(event: "query", listener: (event: { duration: number }) => void): void;
};

prismaQueryEvents.$on("query", (event) => {
  // SQL text and bind values are intentionally discarded: they may contain clinical text.
  observePrismaQuery(event.duration);
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
