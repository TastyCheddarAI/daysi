import { Pool } from "pg";

import type { AppEnv } from "../config";

let cachedPool: Pool | undefined;

export const getPostgresPool = (env: AppEnv): Pool => {
  if (cachedPool) {
    return cachedPool;
  }

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when Postgres persistence is enabled.");
  }

  cachedPool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_MAX_CONNECTIONS,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  });

  return cachedPool;
};
