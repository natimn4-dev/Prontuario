import {
  isSyntheticDietaryPreviewEnvironment,
  type SyntheticPreviewEnvironment,
} from "../domain/security/environment.ts";

export type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
};

const SYNTHETIC_PREVIEW_DATABASE_CONFIG: DatabaseConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "preview-build",
  password: "preview-build",
  database: "preview-build",
  connectionLimit: 1,
};

const DEFAULT_CONNECTION_LIMIT = 5;
const MAX_CONNECTION_LIMIT = 10;

function connectionLimitFromEnvironment(): number {
  const raw = process.env.DATABASE_CONNECTION_LIMIT?.trim();
  if (!raw) return DEFAULT_CONNECTION_LIMIT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_CONNECTION_LIMIT) {
    return DEFAULT_CONNECTION_LIMIT;
  }
  return parsed;
}

export function databaseConfig(
  raw: string | undefined,
  environment: SyntheticPreviewEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
  },
): DatabaseConfig {
  if (!raw) {
    if (isSyntheticDietaryPreviewEnvironment(environment)) {
      return SYNTHETIC_PREVIEW_DATABASE_CONFIG;
    }

    throw new Error("DATABASE_URL não configurada.");
  }

  const url = new URL(raw);

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: connectionLimitFromEnvironment(),
  };
}
