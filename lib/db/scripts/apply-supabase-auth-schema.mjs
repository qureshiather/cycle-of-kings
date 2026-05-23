import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(workspaceRoot, ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "apply-supabase-auth-schema.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(sql);
  console.log("Applied Supabase auth schema on players (auth_user_id, nullable device_id).");
} finally {
  await client.end();
}
