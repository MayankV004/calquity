import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { chatMessages, chatSessions } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedAccountId = searchParams.get('account_id') || 'ACCT-001';

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

    const sessionId = authSession.session.id;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ messages: [], session_id: sessionId, source: 'memory' });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ messages: [], session_id: sessionId, source: 'memory' });
    }

    // Verify session
    const sessions = await db.select().from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.account_id, accountId)));

    if (!sessions.length) {
      return NextResponse.json({ messages: [], session_id: sessionId, source: 'new_session' });
    }

    // Load messages
    const messages = await db.select().from(chatMessages)
      .where(eq(chatMessages.session_id, sessionId))
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
      session_id: sessionId,
      account_id: accountId,
      messages: formattedMessages,
      source: 'postgres',
    });
  } catch (err: any) {
    console.error('Chat History Fetch Error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
