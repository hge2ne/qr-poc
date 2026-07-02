const POSTGRES_SSL_MODES_WITH_UPCOMING_SEMANTIC_CHANGE = new Set([
  "prefer",
  "require",
  "verify-ca",
]);

function normalizePostgresConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      return connectionString;
    }

    const sslMode = url.searchParams.get("sslmode");
    if (
      sslMode &&
      POSTGRES_SSL_MODES_WITH_UPCOMING_SEMANTIC_CHANGE.has(sslMode)
    ) {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getRuntimeDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return normalizePostgresConnectionString(databaseUrl);
}

export function getMigrationDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl =
    env.DATABASE_URL_UNPOOLED ??
    env.POSTGRES_URL_NON_POOLING ??
    env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return normalizePostgresConnectionString(databaseUrl);
}
