import { getLocalDataset, AccountData, OrderData, TicketData, DocChunk } from './dataset';

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

// In-memory store for active escalation proposals across session
const pendingEscalations = new Map<string, EscalationDraft>();

/**
 * Tool 1: Document Search with Authority Metadata & Account Pre-filtering
 */
export async function searchDocuments(
  query: string,
  context: ToolContext,
  topK: number = 4
): Promise<{ chunks: DocumentSearchResult[]; query: string }> {
  const dataset = getLocalDataset();
  const lowerQuery = query.toLowerCase();
  const includesDeprecatedQuery = lowerQuery.includes('deprecated') || lowerQuery.includes('v2') || lowerQuery.includes('old policy');

  // Filter chunks by security and authority rules
  const candidateChunks = dataset.chunks.filter((chunk) => {
    // Filter out deprecated docs unless explicitly asked
    if (chunk.status === 'DEPRECATED' && !includesDeprecatedQuery) {
      return false;
    }

    // Access Control: Customer-specific chunks can ONLY be seen by their matching account
    if (chunk.scope === 'account-specific' && chunk.account_id !== context.accountId) {
      return false;
    }

    return true;
  });

  // Calculate relevance score and authority precedence
  const scored = candidateChunks.map((chunk) => {
    let score = 0;

    // Authority ranking boost
    // 1. Customer agreement for requesting account (Highest priority)
    // 2. Current SOP / Policy
    // 3. Product Ops Guide
    // 4. Deprecated policy
    let authorityRank = 2;
    if (chunk.scope === 'account-specific' && chunk.account_id === context.accountId) {
      authorityRank = 1;
      score += 50; // Boost customer agreement
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

    // Keyword matching score
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

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const results = scored.slice(0, topK).map(({ score, ...rest }) => rest);
  return { chunks: results, query };
}

/**
 * Tool 2: Structured Account Data Lookup with Bound Server Scoping & Calculations
 */
export async function queryAccountData(
  entity: 'orders' | 'tickets' | 'accounts',
  filterId: string | undefined,
  context: ToolContext
): Promise<{ entity: string; data: any; snapshotTime: string; contextAccountId: string }> {
  const dataset = getLocalDataset();
  const sessionAccountId = context.accountId;

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
      // Find order by ID - strictly enforced for sessionAccountId
      const order = dataset.orders.find((o) => o.order_id === filterId);
      if (!order || order.account_id !== sessionAccountId) {
        return {
          entity: 'orders',
          data: null,
          snapshotTime: dataset.snapshotTime,
          contextAccountId: sessionAccountId,
        };
      }

      // Perform SLA / delay calculations
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
      // Return all orders for this account only
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
 * Tool 3: Two-Phase Escalation Action (Propose -> Explicit User Confirm)
 */
export async function createEscalation(
  action: 'propose' | 'confirm',
  params: { proposal_id?: string; ticket_ref?: string; reason: string; summary: string },
  context: ToolContext
): Promise<{ status: string; proposal?: EscalationDraft; message: string }> {
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
