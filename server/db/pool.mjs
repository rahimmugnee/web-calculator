import pg from "pg";
import { databaseConfig } from "../../scripts/db/config.mjs";

let pool;

export function getPool() {
  if (!pool) pool = new pg.Pool(databaseConfig());
  return pool;
}

export async function closePool() {
  if (pool) await pool.end();
  pool = undefined;
}
