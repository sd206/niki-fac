import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    // On Cloud Run, connect via the Unix socket mounted at /cloudsql.
    // The connection string should already include host=/cloudsql/<name>,
    // but as a fallback, build it from CLOUD_SQL_CONNECTION_NAME if the
    // host in the connection string is localhost or missing.
    const cloudSqlConn = process.env.CLOUD_SQL_CONNECTION_NAME;
    let finalConnStr = connectionString;
    if (cloudSqlConn && !connectionString.includes("/cloudsql/")) {
      const u = new URL(connectionString);
      if (!u.hostname || u.hostname === "localhost") {
        u.hostname = `/cloudsql/${cloudSqlConn}`;
        finalConnStr = u.toString();
      }
    }

    pool = new Pool({ connectionString: finalConnStr });
  }
  return pool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Database = ReturnType<typeof getDb>;
