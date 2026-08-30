import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(file = resolve(process.cwd(), ".env")) {
  try {
    for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export function databaseConfig() {
  loadEnvFile();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Copy .env.example to .env and add the PostgreSQL password.");
  }
  return {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  };
}
