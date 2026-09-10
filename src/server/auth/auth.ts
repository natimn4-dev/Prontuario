import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../db";
import {
  isEmailAllowed,
  normalizeEmail,
  parseEmailSet,
  roleForFirstLogin,
  roleForProfessional,
} from "../../domain/security/auth-policy";
import { assertProductionEnvironment } from "../../domain/security/environment";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const allowedEmails = parseEmailSet(process.env.AUTH_ALLOWED_EMAILS);
const bootstrapAdmins = parseEmailSet(process.env.AUTH_BOOTSTRAP_ADMIN_EMAILS);

const canonicalProductionAppUrl = "https://prontuario.nataliamendesgeriatra.com";
const approvedProductionEmailFingerprints = new Set([
  "f3edb3d5dbf548434e230325bc7835275146d04fcc65dcf55d83385956691210",
  "b233416c9c9fecdd75ad43613d16cb2515c19c2ff302e56842dbcd64a876de02",
  "7adbe1e0c628a064adf67f5241674295f6fdb6b4f2c09734532121e6db5e35f4",
  "13e72ccddb396665ef006f83eda5bb0d95d093050923a1ba8ca3c5ebde767840",
]);

function emailFingerprint(email: string): string {
  return createHash("sha256").update(normalizeEmail(email), "utf8").digest("hex");
}

function isApprovedProductionEmail(email: string): boolean {
  return approvedProductionEmailFingerprints.has(emailFingerprint(email));
}

function usesApprovedProductionAccessContract(): boolean {
  return process.env.NODE_ENV === "production"
    || appUrl.replace(/\/$/, "") === canonicalProductionAppUrl;
}

/**
 * Contrato legado mantido deliberadamente para as quatro médicas já aprovadas.
 * Novos profissionais são autorizados por cadastro persistido em UserAccessGrant.
 */
export function isAuthorizedEmail(email: string): boolean {
  if (isApprovedProductionEmail(email)) return true;
  return usesApprovedProductionAccessContract()
    ? false
    : isEmailAllowed(email, allowedEmails);
}

async function findActiveAccessGrant(email: string) {
  return prisma.userAccessGrant.findFirst({
    where: { email: normalizeEmail(email), active: true },
    select: {
      id: true,
      professionalRole: true,
      patientAccessScope: true,
      canManageUsers: true,
    },
  });
}

export async function isAuthorizedEmailForLogin(email: string): Promise<boolean> {
  if (isAuthorizedEmail(email)) return true;
  return Boolean(await findActiveAccessGrant(email));
}

if (process.env.NODE_ENV === "production") {
  assertProductionEnvironment({
    nodeEnv: process.env.NODE_ENV,
    appUrl,
    databaseUrl: process.env.DATABASE_URL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    allowedEmails: process.env.AUTH_ALLOWED_EMAILS,
    bootstrapAdminEmails: process.env.AUTH_BOOTSTRAP_ADMIN_EMAILS,
  });
}

export const auth = betterAuth({
  appName: "Prontuário Aprimorado",
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "mysql" }),
  trustedOrigins: [appUrl],
  telemetry: { enabled: false },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "prontuario",
  },
  user: {
    modelName: "User",
    additionalFields: {
      role: {
        type: "string",
        required: true,
        input: false,
        defaultValue: "PHYSICIAN",
      },
      active: {
        type: "boolean",
        required: true,
        input: false,
        defaultValue: true,
      },
      professionalRole: {
        type: "string",
        required: true,
        input: false,
        defaultValue: "MEDICO",
      },
      patientAccessScope: {
        type: "string",
        required: true,
        input: false,
        defaultValue: "ALL_PATIENTS",
      },
      canManageUsers: {
        type: "boolean",
        required: true,
        input: false,
        defaultValue: false,
      },
      accessManaged: {
        type: "boolean",
        required: true,
        input: false,
        defaultValue: false,
      },
    },
  },
  session: {
    modelName: "Session",
    expiresIn: 8 * 60 * 60,
    updateAge: 30 * 60,
    cookieCache: { enabled: false },
  },
  account: {
    modelName: "Account",
    encryptOAuthTokens: true,
    accountLinking: { enabled: false },
  },
  verification: {
    modelName: "Verification",
    storeIdentifier: "hashed",
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    storage: "database",
    modelName: "RateLimit",
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const grant = await findActiveAccessGrant(user.email);
          const legacyAuthorized = isAuthorizedEmail(user.email);
          if (!legacyAuthorized && !grant) {
            throw new APIError("FORBIDDEN", {
              message: "Conta não autorizada para este prontuário.",
            });
          }

          const bootstrapRole = roleForFirstLogin({
            email: user.email,
            bootstrapAdmins,
          });
          const professionalRole = grant?.professionalRole ?? "MEDICO";
          const role = bootstrapRole === "ADMIN"
            ? "ADMIN"
            : roleForProfessional(professionalRole);

          return {
            data: {
              ...user,
              role,
              active: true,
              professionalRole,
              patientAccessScope: grant?.patientAccessScope ?? "ALL_PATIENTS",
              canManageUsers: bootstrapRole === "ADMIN" || (grant?.canManageUsers ?? false),
              accessManaged: Boolean(grant) || bootstrapRole === "ADMIN",
            },
          };
        },
        after: async (user) => {
          await prisma.userAccessGrant.updateMany({
            where: { email: normalizeEmail(user.email), active: true },
            data: { acceptedAt: new Date() },
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
              id: true,
              email: true,
              role: true,
              active: true,
              accessManaged: true,
            },
          });
          if (!user) {
            throw new APIError("UNAUTHORIZED", { message: "Usuário não encontrado." });
          }
          if (!user.active || (!user.accessManaged && !isAuthorizedEmail(user.email))) {
            throw new APIError("FORBIDDEN", { message: "Acesso ao prontuário revogado." });
          }
          return { data: session };
        },
      },
    },
  },
});
