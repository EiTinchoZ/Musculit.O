const DATABASE_ENV_CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

export function resolveDatabaseUrl() {
  for (const key of DATABASE_ENV_CANDIDATES) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

export function hasDatabaseConnection() {
  return resolveDatabaseUrl() !== null;
}

export function ensureDatabaseUrlEnv() {
  const resolved = resolveDatabaseUrl();

  if (resolved && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = resolved;
  }

  return resolved;
}
