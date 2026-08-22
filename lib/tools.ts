import { getLocalDataset, AccountData, OrderData, TicketData, DocChunk } from './dataset';
import { getDb } from '../db';
import { accounts, orders, tickets, documentChunks, escalations } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface ToolContext {
  accountId: string;
  sessionId: string;
}

export interface DocumentSearchResult {
  chunk_id: string;
  doc_name: string;
  doc_type: string;
  status: string;
  effective_date: string;
  scope: string;
  authority_rank: number;
  content: string;
}

export interface EscalationDraft {
  proposal_id: string;
  account_id: string;
  ticket_ref?: string;
  reason: string;
  summary: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

// In-memory store fallback for active escalation proposals across session
const pendingEscalations = new Map<string, EscalationDraft>();

/**
 * Tool 1: Document Search with Authority Metadata & Account Pre-filtering (DB-Backed)
 */
export async function searchDocuments(
  query: string,
  context: ToolContext,
  topK: number = 4
): Promise<{ chunks: DocumentSearchResult[]; query: string }> {
  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      if (db) {
        const lowerQuery = query.toLowerCase();
        const includesDeprecatedQuery = lowerQuery.includes('deprecated') || lowerQuery.includes('v2') || lowerQuery.includes('old policy');

        const dbChunks = await db.select().from(documentChunks);

        const candidateChunks = dbChunks.filter((chunk) => {
          if (chunk.status === 'DEPRECATED' && !includesDeprecatedQuery) return false;
          if (chunk.scope === 'account-specific' && chunk.account_id !== context.accountId) return false;
          return true;
        });

        const scored = candidateChunks.map((chunk) => {
          let score = 0;
          let authorityRank = 2;
          if (chunk.scope === 'account-specific' && chunk.account_id === context.accountId) {
            authorityRank = 1;
            score += 50;
          } else if (chunk.doc_type === 'sop' || chunk.doc_type === 'policy') {
            authorityRank = 2;
            score += 30;
          } else if (chunk.doc_type === 'product_ops') {
            authorityRank = 3;
            score += 20;
          } else if (chunk.status === 'DEPRECATED') {
            authorityRank = 4;
            score += 5;
          }

          const keywords = lowerQuery.split(/\s+/).filter((k) => k.length > 2);
          const contentLower = chunk.content.toLowerCase();
          for (const kw of keywords) {
            if (contentLower.includes(kw)) score += 10;
          }

          return {
            chunk_id: chunk.id,
            doc_name: chunk.doc_name,
            doc_type: chunk.doc_type,
            status: chunk.status,
            effective_date: chunk.effective_date || '',
            scope: chunk.scope,
            authority_rank: authorityRank,
            content: chunk.content,
            score,
          };
        });

        scored.sort((a, b) => b.score - a.score);
        const results = scored.slice(0, topK).map(({ score, ...rest }) => rest);
        return { chunks: results, query };
      }
    } catch (dbErr) {
      console.warn('DB Search Documents Warning (falling back to memory):', dbErr);
    }
  }

  const dataset = getLocalDataset();
  const lowerQuery = query.toLowerCase();
  const includesDeprecatedQuery = lowerQuery.includes('deprecated') || lowerQuery.includes('v2') || lowerQuery.includes('old policy');

  const candidateChunks = dataset.chunks.filter((chunk) => {
    if (chunk.status === 'DEPRECATED' && !includesDeprecatedQuery) {
      return false;
    }
    if (chunk.scope === 'account-specific' && chunk.account_id !== context.accountId) {
      return false;
    }
    return true;
  });

  const scored = candidateChunks.map((chunk) => {
    let score = 0;
    let authorityRank = 2;
    if (chunk.scope === 'account-specific' && chunk.account_id === context.accountId) {
      authorityRank = 1;
      score += 50;
    } else if (chunk.doc_type === 'sop' || chunk.doc_type === 'policy') {
      authorityRank = 2;
      score += 30;
    } else if (chunk.doc_type === 'product_ops') {
      authorityRank = 3;
      score += 20;
    } else if (chunk.status === 'DEPRECATED') {
      authorityRank = 4;
      score += 5;
    }

    const keywords = lowerQuery.split(/\s+/).filter((k) => k.length > 2);
    const contentLower = chunk.content.toLowerCase();
    for (const kw of keywords) {
      if (contentLower.includes(kw)) {
        score += 10;
      }
    }

    return {
      chunk_id: chunk.id,
      doc_name: chunk.doc_name,
      doc_type: chunk.doc_type,
      status: chunk.status,
      effective_date: chunk.effective_date,
      scope: chunk.scope,
      authority_rank: authorityRank,
      content: chunk.content,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, topK).map(({ score, ...rest }) => rest);
  return { chunks: results, query };
}

/**
 * Tool 2: Structured Account Data Lookup with Bound Server Scoping & Calculations (DB-Backed)
 */
export async function queryAccountData(
  entity: 'orders' | 'tickets' | 'accounts',
  filterId: string | undefined,
  context: ToolContext
): Promise<{ entity: string; data: any; snapshotTime: string; contextAccountId: string }> {
  const sessionAccountId = context.accountId;

  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      if (db) {
        if (entity === 'accounts') {
          const res = await db.select().from(accounts).where(eq(accounts.account_id, sessionAccountId));
          const acc = res[0] || null;
          return {
            entity: 'accounts',
            data: acc,
            snapshotTime: new Date().toISOString(),
            contextAccountId: sessionAccountId,
          };
        }

        if (entity === 'orders') {
          if (filterId) {
            const res = await db.select().from(orders)
              .where(and(eq(orders.order_id, filterId), eq(orders.account_id, sessionAccountId)));
            const order = res[0] || null;
            if (!order) {
              return { entity: 'orders', data: null, snapshotTime: new Date().toISOString(), contextAccountId: sessionAccountId };
            }

            const accRes = await db.select().from(accounts).where(eq(accounts.account_id, sessionAccountId));
            const acc = accRes[0];

            let calculatedDelayHours = 0;
            let pickupLate = false;
            if (order.pickup_window_end && order.pickup_actual_at) {
              const windowEnd = new Date(order.pickup_window_end.replace(' ', 'T')).getTime();
              const actualPickup = new Date(order.pickup_actual_at.replace(' ', 'T')).getTime();
              if (actualPickup > windowEnd) {
                pickupLate = true;
                calculatedDelayHours = Math.round(((actualPickup - windowEnd) / (1000 * 60 * 60)) * 10) / 10;
              }
            }

            return {
              entity: 'orders',
              data: {
                ...order,
                account_name: acc?.account_name,
                account_plan: acc?.plan,
                calculated_pickup_delay_hours: calculatedDelayHours,
                is_pickup_late: pickupLate,
              },
              snapshotTime: new Date().toISOString(),
              contextAccountId: sessionAccountId,
            };
          } else {
            const userOrders = await db.select().from(orders).where(eq(orders.account_id, sessionAccountId));
            return {
              entity: 'orders',
              data: userOrders,
              snapshotTime: new Date().toISOString(),
              contextAccountId: sessionAccountId,
            };
          }
        }

        if (entity === 'tickets') {
          if (filterId) {
            const res = await db.select().from(tickets)
              .where(and(eq(tickets.ticket_id, filterId), eq(tickets.account_id, sessionAccountId)));
            const ticket = res[0] || null;
            if (!ticket) {
              return { entity: 'tickets', data: null, snapshotTime: new Date().toISOString(), contextAccountId: sessionAccountId };
            }
            return {
              entity: 'tickets',
              data: { ...ticket, advisory_note: 'Historical ticket resolution provided as context only — not authoritative policy.' },
              snapshotTime: new Date().toISOString(),
              contextAccountId: sessionAccountId,
            };
          } else {
            const userTickets = await db.select().from(tickets).where(eq(tickets.account_id, sessionAccountId));
            return {
              entity: 'tickets',
              data: userTickets.map((t) => ({ ...t, advisory_note: 'Historical ticket resolution — context only.' })),
              snapshotTime: new Date().toISOString(),
              contextAccountId: sessionAccountId,
            };
          }
        }
      }
    } catch (dbErr) {
      console.warn('DB Query Account Data Warning (falling back to memory):', dbErr);
    }
  }

  const dataset = getLocalDataset();

  if (entity === 'accounts') {
    const account = dataset.accounts.find((a) => a.account_id === sessionAccountId);
    return {
      entity: 'accounts',
      data: account || null,
      snapshotTime: dataset.snapshotTime,
      contextAccountId: sessionAccountId,
    };
  }

  if (entity === 'orders') {
    if (filterId) {
      const order = dataset.orders.find((o) => o.order_id === filterId);
      if (!order || order.account_id !== sessionAccountId) {
        return {
          entity: 'orders',
          data: null,
          snapshotTime: dataset.snapshotTime,
          contextAccountId: sessionAccountId,
        };
      }

      const account = dataset.accounts.find((a) => a.account_id === sessionAccountId);
      let calculatedDelayHours = 0;
      let pickupLate = false;

      if (order.pickup_window_end && order.pickup_actual_at) {
        const windowEnd = new Date(order.pickup_window_end.replace(' ', 'T')).getTime();
        const actualPickup = new Date(order.pickup_actual_at.replace(' ', 'T')).getTime();
        if (actualPickup > windowEnd) {
          pickupLate = true;
          calculatedDelayHours = Math.round(((actualPickup - windowEnd) / (1000 * 60 * 60)) * 10) / 10;
        }
      }

      return {
        entity: 'orders',
        data: {
          ...order,
          account_name: account?.account_name,
          account_plan: account?.plan,
          calculated_pickup_delay_hours: calculatedDelayHours,
          is_pickup_late: pickupLate,
        },
        snapshotTime: dataset.snapshotTime,
        contextAccountId: sessionAccountId,
      };
    } else {
      const userOrders = dataset.orders.filter((o) => o.account_id === sessionAccountId);
      return {
        entity: 'orders',
        data: userOrders,
        snapshotTime: dataset.snapshotTime,
        contextAccountId: sessionAccountId,
      };
    }
  }

  if (entity === 'tickets') {
    if (filterId) {
      const ticket = dataset.tickets.find((t) => t.ticket_id === filterId);
      if (!ticket || ticket.account_id !== sessionAccountId) {
        return {
          entity: 'tickets',
          data: null,
          snapshotTime: dataset.snapshotTime,
          contextAccountId: sessionAccountId,
        };
      }
      return {
        entity: 'tickets',
        data: { ...ticket, advisory_note: 'Historical ticket resolution provided as context only — not authoritative policy.' },
        snapshotTime: dataset.snapshotTime,
        contextAccountId: sessionAccountId,
      };
    } else {
      const userTickets = dataset.tickets.filter((t) => t.account_id === sessionAccountId);
      return {
        entity: 'tickets',
        data: userTickets.map((t) => ({ ...t, advisory_note: 'Historical ticket resolution — context only.' })),
        snapshotTime: dataset.snapshotTime,
        contextAccountId: sessionAccountId,
      };
    }
  }

  return { entity, data: null, snapshotTime: dataset.snapshotTime, contextAccountId: sessionAccountId };
}

/**
 * Tool 3: Two-Phase Escalation Action (DB-Backed: Propose -> Explicit User Confirm)
 */
export async function createEscalation(
  action: 'propose' | 'confirm',
  params: { proposal_id?: string; ticket_ref?: string; reason: string; summary: string },
  context: ToolContext
): Promise<{ status: string; proposal?: EscalationDraft; message: string }> {
  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      if (db) {
        if (action === 'propose') {
          const proposalId = `PROP-${Math.floor(1000 + Math.random() * 9000)}`;
          const draft: EscalationDraft = {
            proposal_id: proposalId,
            account_id: context.accountId,
            ticket_ref: params.ticket_ref,
            reason: params.reason,
            summary: params.summary,
            status: 'pending',
            created_at: new Date().toISOString(),
          };

          await db.insert(escalations).values({
            id: proposalId,
            session_id: context.sessionId,
            account_id: context.accountId,
            ticket_ref: params.ticket_ref || null,
            reason: params.reason,
            summary: params.summary,
            status: 'pending',
          }).onConflictDoNothing();

          pendingEscalations.set(proposalId, draft);

          return {
            status: 'proposed',
            proposal: draft,
            message: `Escalation draft created (${proposalId}). Requires explicit user confirmation to execute.`,
          };
        }

        if (action === 'confirm') {
          if (!params.proposal_id) {
            return {
              status: 'error',
              message: 'No proposal_id specified for confirmation.',
            };
          }

          const existing = await db.select().from(escalations)
            .where(and(eq(escalations.id, params.proposal_id), eq(escalations.account_id, context.accountId)));

          if (existing.length > 0) {
            await db.update(escalations)
              .set({ status: 'confirmed' })
              .where(eq(escalations.id, params.proposal_id));
          }

          const draft = pendingEscalations.get(params.proposal_id) || {
            proposal_id: params.proposal_id,
            account_id: context.accountId,
            ticket_ref: params.ticket_ref,
            reason: params.reason,
            summary: params.summary,
            status: 'confirmed',
            created_at: new Date().toISOString(),
          };

          draft.status = 'confirmed';
          pendingEscalations.set(params.proposal_id, draft);

          const ticketId = `TKT-${Math.floor(600 + Math.random() * 300)}`;

          return {
            status: 'confirmed',
            proposal: draft,
            message: `Escalation confirmed and submitted! Created support escalation ticket ${ticketId}.`,
          };
        }
      }
    } catch (dbErr) {
      console.warn('DB Escalation Error (falling back to memory):', dbErr);
    }
  }

  if (action === 'propose') {
    const proposalId = `PROP-${Math.floor(1000 + Math.random() * 9000)}`;
    const draft: EscalationDraft = {
      proposal_id: proposalId,
      account_id: context.accountId,
      ticket_ref: params.ticket_ref,
      reason: params.reason,
      summary: params.summary,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    pendingEscalations.set(proposalId, draft);

    return {
      status: 'proposed',
      proposal: draft,
      message: `Escalation draft created (${proposalId}). Requires explicit user confirmation to execute.`,
    };
  }

  if (action === 'confirm') {
    if (!params.proposal_id) {
      return {
        status: 'error',
        message: 'No proposal_id specified for confirmation.',
      };
    }

    const draft = pendingEscalations.get(params.proposal_id);
    if (!draft || draft.account_id !== context.accountId || draft.status !== 'pending') {
      return {
        status: 'error',
        message: 'Invalid, expired, or un-owned proposal ID.',
      };
    }

    draft.status = 'confirmed';
    pendingEscalations.set(params.proposal_id, draft);

    const ticketId = `TKT-${Math.floor(600 + Math.random() * 300)}`;

    return {
      status: 'confirmed',
      proposal: draft,
      message: `Escalation confirmed and submitted! Created support escalation ticket ${ticketId}.`,
    };
  }

  return { status: 'error', message: 'Invalid action type.' };
}
