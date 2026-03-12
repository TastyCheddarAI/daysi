import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

const MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../infra/sql/migrations",
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const client = await pool.connect();
try {
  await client.query("BEGIN");

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await client.query<{ version: string }>(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  const applied = new Set(rows.map((r) => r.version));

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = await readFile(resolve(MIGRATIONS_DIR, file), "utf8");
    console.log(`Applying migration: ${file}`);
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
    count++;
  }

  await client.query("COMMIT");
  console.log(`Migrations complete. ${count} new migration(s) applied.`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
