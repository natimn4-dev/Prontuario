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
  const previous = process.env.DATABASE_CONNECTION_LIMIT;
  delete process.env.DATABASE_CONNECTION_LIMIT;
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
  if (previous === undefined) delete process.env.DATABASE_CONNECTION_LIMIT;
  else process.env.DATABASE_CONNECTION_LIMIT = previous;
});

test("limite de conexões pode ser ajustado por ambiente dentro do teto seguro", () => {
  const previous = process.env.DATABASE_CONNECTION_LIMIT;
  process.env.DATABASE_CONNECTION_LIMIT = "7";
  assert.equal(databaseConfig("mysql://clinician:secret@db.example.test/prontuario").connectionLimit, 7);
  process.env.DATABASE_CONNECTION_LIMIT = "99";
  assert.equal(databaseConfig("mysql://clinician:secret@db.example.test/prontuario").connectionLimit, 5);
  if (previous === undefined) delete process.env.DATABASE_CONNECTION_LIMIT;
  else process.env.DATABASE_CONNECTION_LIMIT = previous;
});
