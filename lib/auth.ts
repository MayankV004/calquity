import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      ...schema,
      account: schema.authAccount, // alias prevents collision with app-level accounts table
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization(),
  ],
  secret: process.env.BETTER_AUTH_SECRET || 'parcelpilot-super-secret-key-32-chars-min',
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'), // vercel preview URL fallback
});
