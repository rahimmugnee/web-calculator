import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { databaseConfig } from "./config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDirectory = join(root, "database", "migrations");
const client = new pg.Client(databaseConfig());

await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const applied = new Set((await client.query("SELECT version FROM schema_migrations")).rows.map((row) => row.version));
  const files = readdirSync(migrationsDirectory).filter((file) => /^\d+.*\.sql$/.test(file)).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDirectory, file), "utf8");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
    console.log(`Applied ${file}`);
  }
  console.log("Database migrations are up to date.");
} finally {
  await client.end();
}
