import dotenv from 'dotenv';
dotenv.config();

import { sql } from 'drizzle-orm';
import { db } from '../db';
import { accounts, orders, tickets, documentChunks } from '../db/schema';
import { getLocalDataset } from '../lib/dataset';

async function main() {
  console.log('🚀 Starting Data Ingestion into PostgreSQL + pgvector...');

  if (!process.env.DATABASE_URL) {
    console.log('ℹ️ DATABASE_URL not set in environment. Skipping cloud PostgreSQL ingestion.');
    console.log('✅ Local dataset fallback is ready for in-process execution!');
    return;
  }

  const dataset = getLocalDataset();

  console.log(`📦 Loaded local dataset snapshot: ${dataset.snapshotTime}`);
  console.log(`- Accounts: ${dataset.accounts.length}`);
  console.log(`- Orders: ${dataset.orders.length}`);
  console.log(`- Tickets: ${dataset.tickets.length}`);
  console.log(`- Document Chunks: ${dataset.chunks.length}`);

  try {
    console.log('⚙️ Initializing database tables and pgvector extension...');
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id VARCHAR(64) PRIMARY KEY,
        account_name VARCHAR(255) NOT NULL,
        plan VARCHAR(64),
        status VARCHAR(64),
        csm VARCHAR(128),
        contract_file VARCHAR(255),
        premium_support BOOLEAN DEFAULT FALSE,
        notes TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(64) PRIMARY KEY,
        account_id VARCHAR(64) NOT NULL REFERENCES accounts(account_id),
        carrier VARCHAR(128),
        status VARCHAR(64) NOT NULL,
        booked_at TEXT,
        pickup_window_start TEXT,
        pickup_window_end TEXT,
        pickup_actual_at TEXT,
        delivery_window_start TEXT,
        delivery_window_end TEXT,
        actual_delivery TEXT,
        shipment_fee_inr INTEGER,
        carrier_fault BOOLEAN DEFAULT FALSE,
        customer_fault BOOLEAN DEFAULT FALSE,
        cancellation_requested_at TEXT,
        cancellation_fee_waived BOOLEAN DEFAULT FALSE,
        notes TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tickets (
        ticket_id VARCHAR(64) PRIMARY KEY,
        account_id VARCHAR(64) NOT NULL REFERENCES accounts(account_id),
        order_id VARCHAR(64),
        created_at TEXT,
        status VARCHAR(64),
        subject TEXT,
        description TEXT,
        channel VARCHAR(64),
        assigned_to VARCHAR(128),
        last_customer_message_at TEXT,
        resolution TEXT,
        advisory_only BOOLEAN DEFAULT TRUE NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id VARCHAR(128) PRIMARY KEY,
        doc_id VARCHAR(128) NOT NULL,
        doc_name VARCHAR(255) NOT NULL,
        doc_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        effective_date VARCHAR(64),
        scope VARCHAR(32) NOT NULL,
        account_id VARCHAR(64),
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding VECTOR(1536)
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS escalations (
        id VARCHAR(128) PRIMARY KEY,
        session_id VARCHAR(128) NOT NULL,
        account_id VARCHAR(64) NOT NULL,
        ticket_ref VARCHAR(128),
        reason TEXT NOT NULL,
        summary TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Ingest Accounts
    console.log('Uploading accounts to Neon PostgreSQL...');
    for (const acc of dataset.accounts) {
      await db.insert(accounts).values({
        account_id: acc.account_id,
        account_name: acc.account_name,
        plan: acc.plan,
        status: acc.status,
        csm: acc.csm,
        contract_file: acc.contract_file,
        premium_support: acc.premium_support,
        notes: acc.notes,
      }).onConflictDoNothing();
    }

    // Ingest Orders
    console.log('Uploading orders...');
    for (const ord of dataset.orders) {
      await db.insert(orders).values({
        order_id: ord.order_id,
        account_id: ord.account_id,
        carrier: ord.carrier,
        status: ord.status,
        booked_at: ord.booked_at,
        pickup_window_start: ord.pickup_window_start,
        pickup_window_end: ord.pickup_window_end,
        pickup_actual_at: ord.pickup_actual_at,
        delivery_window_start: ord.delivery_window_start,
        delivery_window_end: ord.delivery_window_end,
        actual_delivery: ord.actual_delivery,
        shipment_fee_inr: ord.shipment_fee_inr,
        carrier_fault: ord.carrier_fault,
        customer_fault: ord.customer_fault,
        cancellation_requested_at: ord.cancellation_requested_at,
        cancellation_fee_waived: ord.cancellation_fee_waived,
        notes: ord.notes,
      }).onConflictDoNothing();
    }

    // Ingest Tickets
    console.log('Uploading tickets...');
    for (const tkt of dataset.tickets) {
      await db.insert(tickets).values({
        ticket_id: tkt.ticket_id,
        account_id: tkt.account_id,
        order_id: tkt.order_id,
        created_at: tkt.created_at,
        status: tkt.status,
        subject: tkt.subject,
        description: tkt.description,
        channel: tkt.channel,
        assigned_to: tkt.assigned_to,
        last_customer_message_at: tkt.last_customer_message_at,
        resolution: tkt.resolution,
        advisory_only: tkt.advisory_only,
      }).onConflictDoNothing();
    }

    // Ingest Document Chunks
    console.log('Uploading document chunks...');
    for (const chunk of dataset.chunks) {
      await db.insert(documentChunks).values({
        id: chunk.id,
        doc_id: chunk.doc_id,
        doc_name: chunk.doc_name,
        doc_type: chunk.doc_type,
        status: chunk.status,
        effective_date: chunk.effective_date,
        scope: chunk.scope,
        account_id: chunk.account_id,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
      }).onConflictDoNothing();
    }

    console.log('🎉 Data Ingestion into Neon PostgreSQL Complete!');
  } catch (err) {
    console.error('❌ Error during database ingestion:', err);
  }
}

main();
