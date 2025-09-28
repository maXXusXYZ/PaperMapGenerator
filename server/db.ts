import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Allow running without database in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

if (!process.env.DATABASE_URL && !isDevelopment) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use a dummy connection string for development if DATABASE_URL is not set
const connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost/dummy';

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
