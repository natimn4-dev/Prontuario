import assert from "node:assert/strict";
import test from "node:test";
import { databaseConfig } from "../../src/server/database-config.ts";

test("preview sem banco usa apenas configuração descartável", () => {
  assert.deepEqual(databaseConfig(undefined, {
    nodeEnv: "production",
    vercelEnv: "preview",
    vercelGitCommitRef: "preview/dietary-calculator-vercel",
  }), {
    host: "127.0.0.1",
    port: 3306,
    user: "preview-build",
    password: "preview-build",
    database: "preview-build",
    connectionLimit: 1,
  });
});

test("runtime sem DATABASE_URL continua bloqueado", () => {
  assert.throws(
    () => databaseConfig(undefined, {
      nodeEnv: "production",
      vercelEnv: "production",
      vercelGitCommitRef: "main",
    }),
    /DATABASE_URL não configurada/,
  );
});

test("preview sintético usa configuração descartável também no runtime", () => {
  assert.deepEqual(databaseConfig(undefined, {
    nodeEnv: "production",
    vercelEnv: "preview",
    vercelGitCommitRef: "preview/dietary-calculator-vercel",
  }), {
    host: "127.0.0.1",
    port: 3306,
    user: "preview-build",
    password: "preview-build",
    database: "preview-build",
    connectionLimit: 1,
  });
});

test("build de outra branch continua exigindo DATABASE_URL", () => {
  assert.throws(
    () => databaseConfig(undefined, {
      nodeEnv: "production",
      vercelEnv: "preview",
      vercelGitCommitRef: "feature/other-branch",
    }),
    /DATABASE_URL não configurada/,
  );
});

test("configuração real preserva a URL do ambiente", () => {
  assert.deepEqual(
    databaseConfig("mysql://clinician:p%40ss@db.example.test:3307/prontuario"),
    {
      host: "db.example.test",
      port: 3307,
      user: "clinician",
      password: "p@ss",
      database: "prontuario",
      connectionLimit: 5,
    },
  );
});
