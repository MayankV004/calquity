import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { chatMessages, chatSessions } from '@/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedAccountId = searchParams.get('account_id') || 'ACCT-001';
    const action = searchParams.get('action');
    const threadId = searchParams.get('thread_id');

    // bind session user to mapped demo account
    const authSession = await auth.api.getSession({ headers: req.headers });
    if (!authSession?.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let accountId = authSession.session.activeOrganizationId || authSession.session.userId;
    if (authSession.user?.email === 'northstar@parcelpilot.com') {
      accountId = 'ACCT-001';
    } else if (authSession.user?.email === 'lumenworks@parcelpilot.com') {
      accountId = 'ACCT-002';
    } else if (authSession.user?.email === 'beacon@parcelpilot.com') {
      accountId = 'ACCT-003';
    } else if (requestedAccountId && ['ACCT-001', 'ACCT-002', 'ACCT-003'].includes(requestedAccountId)) {
      return NextResponse.json({ error: "Forbidden: Account access denied" }, { status: 403 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ messages: [], threads: [], source: 'memory' });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ messages: [], threads: [], source: 'memory' });
    }

    // Return all threads for account
    if (action === 'threads') {
      const sessions = await db.select().from(chatSessions)
        .where(eq(chatSessions.account_id, accountId))
        .orderBy(desc(chatSessions.updated_at));

      const threads = sessions.map((s) => ({
        id: s.id,
        title: s.title || `Thread ${s.id}`,
        updatedAt: s.updated_at ? s.updated_at.toISOString() : new Date().toISOString(),
      }));

      return NextResponse.json({ threads, account_id: accountId });
    }

    // Load messages for specific thread_id or default to session
    const targetSessionId = threadId || authSession.session.id;

    // Verify session belongs to account
    const sessions = await db.select().from(chatSessions)
      .where(and(eq(chatSessions.id, targetSessionId), eq(chatSessions.account_id, accountId)));

    if (!sessions.length && threadId) {
      return NextResponse.json({ messages: [], thread_id: targetSessionId, source: 'new_thread' });
    }

    // Load messages
    const messages = await db.select().from(chatMessages)
      .where(eq(chatMessages.session_id, targetSessionId))
      .orderBy(asc(chatMessages.created_at));

    const formattedMessages = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolTraces: m.tool_traces ? JSON.parse(m.tool_traces) : undefined,
      proposalDraft: m.proposal_draft ? JSON.parse(m.proposal_draft) : undefined,
      confidence: m.confidence || undefined,
      createdAt: m.created_at,
    }));

    return NextResponse.json({
      thread_id: targetSessionId,
      account_id: accountId,
      messages: formattedMessages,
      source: 'postgres',
    });
  } catch (err: any) {
    console.error('Chat History Fetch Error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('thread_id');

    const authSession = await auth.api.getSession({ headers: req.headers });
    if (!authSession?.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let accountId = authSession.session.activeOrganizationId || authSession.session.userId;
    if (authSession.user?.email === 'northstar@parcelpilot.com') {
      accountId = 'ACCT-001';
    } else if (authSession.user?.email === 'lumenworks@parcelpilot.com') {
      accountId = 'ACCT-002';
    } else if (authSession.user?.email === 'beacon@parcelpilot.com') {
      accountId = 'ACCT-003';
    }

    if (process.env.DATABASE_URL) {
      const db = getDb();
      if (db) {
        if (threadId) {
          await db.delete(chatMessages).where(eq(chatMessages.session_id, threadId));
          await db.delete(chatSessions).where(and(eq(chatSessions.id, threadId), eq(chatSessions.account_id, accountId)));
        } else {
          // Clear all threads for active session/account
          await db.delete(chatMessages).where(eq(chatMessages.session_id, authSession.session.id));
        }
      }
    }

    return NextResponse.json({ success: true, message: "Thread cleared successfully" });
  } catch (err: any) {
    console.error('Chat History Delete Error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
