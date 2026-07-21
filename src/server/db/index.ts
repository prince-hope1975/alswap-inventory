import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import ws from "ws";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  postgresConnection: postgres.Sql | undefined;
  neonPool: Pool | undefined;
};

function createPostgresDatabase() {
  const connection =
    globalForDb.postgresConnection ?? postgres(env.DATABASE_URL);
  if (env.NODE_ENV !== "production")
    globalForDb.postgresConnection = connection;
  return drizzlePostgres(connection, { schema });
}

type Database = ReturnType<typeof createPostgresDatabase>;

function createNeonWebSocketDatabase(): Database {
  neonConfig.webSocketConstructor = ws;

  const pool =
    globalForDb.neonPool ?? new Pool({ connectionString: env.DATABASE_URL });
  if (env.NODE_ENV !== "production") globalForDb.neonPool = pool;

  // Both Drizzle adapters expose the same PostgreSQL query surface. Keep one
  // exported DB type so existing routers remain transport-agnostic.
  return drizzleNeon(pool, { schema }) as unknown as Database;
}

export const db =
  env.DATABASE_TRANSPORT === "websocket"
    ? createNeonWebSocketDatabase()
    : createPostgresDatabase();
