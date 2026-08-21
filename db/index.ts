import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

// Export lazy db proxy
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const database = getDb();
    if (!database) {
      throw new Error('DATABASE_URL is not configured in environment variables.');
    }
    return (database as any)[prop];
  },
});
