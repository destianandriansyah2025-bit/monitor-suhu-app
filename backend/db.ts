import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Exportable variables (may be undefined in dev without DB)
export let pool: pg.Pool | undefined;
export let db: ReturnType<typeof drizzle> | undefined;

if (process.env.SKIP_DB === "true") {
  console.warn("Running without database (SKIP_DB=true)");
  pool = undefined;
  db = undefined;
} else if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "") {
  console.warn("DATABASE_URL not set, using in-memory storage");
  pool = undefined;
  db = undefined;
} else {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
}
