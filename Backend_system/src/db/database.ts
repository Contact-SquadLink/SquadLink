import { Pool } from "pg";
import { env } from "../config/env";

export const db = new Pool({
  connectionString: env.DATABASE_URL,

  max: 15,

  idleTimeoutMillis: 30_000,

  connectionTimeoutMillis: 15_000,

  ssl: {
    rejectUnauthorized: false
  }
});

db.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});