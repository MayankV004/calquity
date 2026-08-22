import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { chatMessages, chatSessions } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id') || 'SESS-101';
    const accountId = searchParams.get('account_id') || 'ACCT-001';

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
