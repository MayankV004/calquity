import { pgTable, text, varchar, boolean, integer, timestamp, vector } from 'drizzle-orm/pg-core';

export const accounts = pgTable('accounts', {
  account_id: varchar('account_id', { length: 64 }).primaryKey(),
  account_name: varchar('account_name', { length: 255 }).notNull(),
  plan: varchar('plan', { length: 64 }),
  status: varchar('status', { length: 64 }),
  csm: varchar('csm', { length: 128 }),
  contract_file: varchar('contract_file', { length: 255 }),
  premium_support: boolean('premium_support').default(false),
  notes: text('notes'),
});

export const orders = pgTable('orders', {
  order_id: varchar('order_id', { length: 64 }).primaryKey(),
  account_id: varchar('account_id', { length: 64 }).notNull().references(() => accounts.account_id),
  carrier: varchar('carrier', { length: 128 }),
  status: varchar('status', { length: 64 }).notNull(),
  booked_at: text('booked_at'),
  pickup_window_start: text('pickup_window_start'),
  pickup_window_end: text('pickup_window_end'),
  pickup_actual_at: text('pickup_actual_at'),
  delivery_window_start: text('delivery_window_start'),
  delivery_window_end: text('delivery_window_end'),
  actual_delivery: text('actual_delivery'),
  shipment_fee_inr: integer('shipment_fee_inr'),
  carrier_fault: boolean('carrier_fault').default(false),
  customer_fault: boolean('customer_fault').default(false),
  cancellation_requested_at: text('cancellation_requested_at'),
  cancellation_fee_waived: boolean('cancellation_fee_waived').default(false),
  notes: text('notes'),
});

export const tickets = pgTable('tickets', {
  ticket_id: varchar('ticket_id', { length: 64 }).primaryKey(),
  account_id: varchar('account_id', { length: 64 }).notNull().references(() => accounts.account_id),
  order_id: varchar('order_id', { length: 64 }),
  created_at: text('created_at'),
  status: varchar('status', { length: 64 }),
  subject: text('subject'),
  description: text('description'),
  channel: varchar('channel', { length: 64 }),
  assigned_to: varchar('assigned_to', { length: 128 }),
  last_customer_message_at: text('last_customer_message_at'),
  resolution: text('resolution'),
  advisory_only: boolean('advisory_only').default(true).notNull(),
});

export const documentChunks = pgTable('document_chunks', {
  id: varchar('id', { length: 128 }).primaryKey(),
  doc_id: varchar('doc_id', { length: 128 }).notNull(),
  doc_name: varchar('doc_name', { length: 255 }).notNull(),
  doc_type: varchar('doc_type', { length: 64 }).notNull(), // 'policy' | 'sop' | 'agreement' | 'product_ops'
  status: varchar('status', { length: 32 }).notNull(), // 'CURRENT' | 'DEPRECATED'
  effective_date: varchar('effective_date', { length: 64 }),
  scope: varchar('scope', { length: 32 }).notNull(), // 'general' | 'account-specific'
  account_id: varchar('account_id', { length: 64 }), // null for general, or 'ACCT-001' for specific agreement
  chunk_index: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
});

export const escalations = pgTable('escalations', {
  id: varchar('id', { length: 128 }).primaryKey(),
  session_id: varchar('session_id', { length: 128 }).notNull(),
  account_id: varchar('account_id', { length: 64 }).notNull(),
  ticket_ref: varchar('ticket_ref', { length: 128 }),
  reason: text('reason').notNull(),
  summary: text('summary').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'), // 'pending' | 'confirmed' | 'cancelled'
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const chatSessions = pgTable('chat_sessions', {
  id: varchar('id', { length: 128 }).primaryKey(),
  account_id: varchar('account_id', { length: 64 }).notNull(),
  title: text('title'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: varchar('id', { length: 128 }).primaryKey(),
  session_id: varchar('session_id', { length: 128 }).notNull(),
  role: varchar('role', { length: 32 }).notNull(),
  content: text('content').notNull(),
  tool_traces: text('tool_traces'),
  proposal_draft: text('proposal_draft'),
  confidence: varchar('confidence', { length: 32 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Better Auth Schema Tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id),
  activeOrganizationId: text('active_organization_id'),
});

export const authAccount = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  issuer: text('issuer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: text('metadata'),
});

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id),
  userId: text('user_id').notNull().references(() => user.id),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type Escalation = typeof escalations.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Organization = typeof organization.$inferSelect;
