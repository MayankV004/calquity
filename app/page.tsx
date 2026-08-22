'use client';

import React, { useState, useEffect, useRef } from 'react';
import AuthModal from '@/app/components/AuthModal';
import { authClient } from '@/lib/auth-client';
import { Lock, LogOut, User } from 'lucide-react';

interface ToolTrace {
  toolName: string;
  args: any;
  resultSummary: string;
}

interface ProposalDraft {
  proposal_id: string;
  account_id: string;
  ticket_ref?: string;
  reason: string;
  summary: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolTraces?: ToolTrace[];
  proposalDraft?: ProposalDraft;
  confidence?: 'high' | 'medium' | 'low';
  isThinking?: boolean;
}

const ACCOUNTS = [
  { id: 'ACCT-001', name: 'Northstar Logistics', shortName: 'Northstar', tier: 'Enterprise', csm: 'Priya Mehta' },
  { id: 'ACCT-002', name: 'LumenWorks', shortName: 'LumenWorks', tier: 'Growth', csm: 'Arjun Rao' },
  { id: 'ACCT-003', name: 'Beacon Retail', shortName: 'Beacon', tier: 'Standard', csm: 'Neha Kapoor' },
];

function getWelcomeMessage(acc: typeof ACCOUNTS[0]): ChatMessage {
  return {
    id: `welcome-${acc.id}`,
    role: 'assistant',
    content:
      `Welcome to ParcelPilot Support.\n\n` +
      `You are currently signed in as **${acc.name}** (\`${acc.id}\` - **${acc.tier} Plan**).\n\n` +
      `Ask a question about your order cancellations, late pickup service credits, or support policies below.`,
    confidence: 'high',
  };
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-[var(--text-main)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-[var(--panel-bg)] font-mono text-[11px] text-[var(--accent-orange)]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function FormattedText({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-sm text-[var(--accent-orange)] mt-2.5 mb-1">
              {trimmed.replace(/^###\s+/, '')}
            </h4>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-bold text-base text-[var(--accent-orange)] mt-3 mb-1">
              {trimmed.replace(/^##\s+/, '')}
            </h3>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletContent = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-[var(--accent-orange)] font-bold text-xs leading-5">•</span>
              <div className="flex-1">{renderInlineFormatting(bulletContent)}</div>
            </div>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const numberContent = trimmed.replace(/^\d+\.\s+/, '');
          const num = trimmed.match(/^\d+/)?.[0];
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-[var(--accent-orange)] font-bold text-xs leading-5">{num}.</span>
              <div className="flex-1">{renderInlineFormatting(numberContent)}</div>
            </div>
          );
        }

        return <p key={idx}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedAccount, setSelectedAccount] = useState(ACCOUNTS[0]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoadedRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [getWelcomeMessage(ACCOUNTS[0])]);

  useEffect(() => {
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
  }, []);

  // Load chat messages from API or localStorage on account switch
  useEffect(() => {
    let isCancelled = false;
    setInitialLoading(true);

    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat/history?account_id=${selectedAccount.id}&session_id=SESS-101`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0 && !isCancelled) {
            setMessages(data.messages);
            isLoadedRef.current = true;
            return;
          }
        }
      } catch (err) {
        console.warn('API history fetch warning:', err);
      }

      try {
        const saved = localStorage.getItem(`parcelpilot_msgs_${selectedAccount.id}`);
        if (saved && !isCancelled) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            isLoadedRef.current = true;
            return;
          }
        }
      } catch (e) {
        console.error('Error loading localStorage history:', e);
      }

      if (!isCancelled) {
        setMessages([getWelcomeMessage(selectedAccount)]);
        isLoadedRef.current = true;
      }
    }

    loadHistory().finally(() => {
      if (!isCancelled) {
        setTimeout(() => setInitialLoading(false), 300);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedAccount]);

  // Persist chat messages to localStorage when updated
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem(`parcelpilot_msgs_${selectedAccount.id}`, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving history:', e);
    }
  }, [messages, selectedAccount]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      localStorage.setItem('parcelpilot_theme', nextTheme);
      return nextTheme;
    });
  };

  const handleClearHistory = () => {
    localStorage.removeItem(`parcelpilot_msgs_${selectedAccount.id}`);
    setMessages([getWelcomeMessage(selectedAccount)]);
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const asstMsgId = `asst-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
    };

    const thinkingMsg: ChatMessage = {
      id: asstMsgId,
      role: 'assistant',
      content: '',
      isThinking: true,
      confidence: 'high',
    };

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount.id,
          session_id: `SESS-${selectedAccount.id}`,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error('Authentication Required: Please click "Sign In" at the top to access the assistant.');
        } else if (res.status === 403) {
          throw new Error('Access Denied: You do not have permission for this account.');
        }
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      if (!res.body) throw new Error('No stream body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'meta') {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === asstMsgId
                    ? {
                        ...msg,
                        isThinking: false,
                        toolTraces: parsed.toolTraces,
                        proposalDraft: parsed.proposalDraft,
                        confidence: parsed.confidence,
                      }
                    : msg
                )
              );
            } else if (parsed.type === 'text') {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === asstMsgId
                    ? { ...msg, isThinking: false, content: msg.content + parsed.chunk }
                    : msg
                )
              );
            }
          } catch (e) {
            console.error('Parse line error:', e);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || 'An error occurred while processing your request.';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === asstMsgId
            ? { ...msg, isThinking: false, content: errorMessage, confidence: 'low' }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProposal = (proposalId: string) => {
    handleSend(`Confirm escalation proposal ${proposalId}`);
  };

  if (initialLoading) {
    return (
      <div className="h-screen h-[100dvh] w-full flex flex-col items-center justify-center bg-[var(--bg-color)] text-[var(--text-main)] transition-colors duration-300 p-6 font-sans">
        <div className="max-w-sm w-full flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Animated Logo Container */}
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-orange)]/20 via-transparent to-orange-500/10 animate-pulse" />
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-[var(--accent-orange)] border-t-transparent animate-spin" />
              <div className="absolute w-3 h-3 rounded-full bg-[var(--accent-orange)] shadow-md shadow-orange-500/50 animate-ping" />
            </div>
          </div>

          {/* App Branding */}
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold tracking-tight">
              ParcelPilot <span className="text-[var(--accent-orange)]">Support</span>
            </h2>
            <p className="text-xs text-[var(--text-sub)] font-medium">
              Loading {selectedAccount.name} trajectory...
            </p>
          </div>

          {/* Skeleton Loaders */}
          <div className="w-full space-y-2.5 pt-2">
            <div className="h-2 w-3/4 mx-auto rounded-full bg-[var(--card-bg)] animate-pulse" />
            <div className="h-2 w-1/2 mx-auto rounded-full bg-[var(--card-bg)] animate-pulse [animation-delay:0.2s]" />
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] max-h-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ease-out bg-[var(--bg-color)] text-[var(--text-main)]">
      
      {/* Mobile & Desktop Responsive Header */}
      <header className="shrink-0 px-4 sm:px-8 py-3 sm:py-4 transition-all duration-300 bg-[var(--bg-color)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          
          {/* App Title */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start">
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                ParcelPilot <span className="text-[var(--accent-orange)]">Support</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-[var(--text-sub)] font-medium">Customer Operations Assistant</p>
            </div>

            {/* Mobile Actions (Clear & Theme) */}
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                onClick={handleClearHistory}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors bg-[var(--card-bg)]"
              >
                Clear
              </button>
              <button
                onClick={toggleTheme}
                className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-300 bg-[var(--card-bg)] text-[var(--text-main)]"
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Account Switcher Tabs & Desktop Theme Switcher */}
          <div className="w-full sm:w-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center p-1 rounded-full bg-[var(--card-bg)] whitespace-nowrap overflow-x-auto no-scrollbar max-w-full">
              {ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc)}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all duration-300 ease-out whitespace-nowrap ${
                    selectedAccount.id === acc.id
                      ? 'bg-[var(--accent-orange)] text-white shadow-md shadow-orange-500/20'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span className="sm:hidden">{acc.shortName}</span>
                  <span className="hidden sm:inline">{acc.name}</span>
                </button>
              ))}
            </div>

            {/* Clear History Button */}
            <button
              onClick={handleClearHistory}
              className="hidden sm:block px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-out bg-[var(--card-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--panel-bg)] shadow-sm whitespace-nowrap"
            >
              Clear Chat
            </button>

            {/* Desktop Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="hidden sm:block px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-out bg-[var(--card-bg)] text-[var(--text-main)] hover:bg-[var(--panel-bg)] shadow-sm whitespace-nowrap"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            {/* Authentication Button */}
            {session?.user ? (
              <button
                onClick={() => authClient.signOut()}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap"
                title={`Logged in as ${session.user.email}`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{session.user.name || session.user.email.split('@')[0]}</span>
                <LogOut className="w-3 h-3 ml-1" />
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent-orange)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/20 whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Better Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />

      {/* Main Single-Viewport Container */}
      <main className="flex-1 min-h-0 max-w-5xl w-full mx-auto px-4 sm:px-6 py-2 flex flex-col justify-between gap-2.5 sm:gap-3 overflow-hidden">
        
        {/* Active Account Status Bar */}
        <div className="shrink-0 p-3 sm:p-3.5 px-4 sm:px-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] sm:text-xs gap-1 sm:gap-2 transition-all duration-300 bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm">
          <div className="truncate w-full sm:w-auto">
            <span className="font-bold text-[var(--accent-orange)]">{selectedAccount.name}</span> ({selectedAccount.id}) • Plan: <span className="font-semibold text-[var(--accent-orange)]">{selectedAccount.tier}</span> • CSM: {selectedAccount.csm}
          </div>
          <div className="font-mono text-[var(--text-sub)] text-[10px] sm:text-[11px]">
            Snapshot: 2026-08-16 11:00 IST
          </div>
        </div>

        {/* Responsive Chat Stream Container */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3.5 no-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div
                className={`max-w-[92%] sm:max-w-2xl rounded-3xl p-4 sm:p-4.5 text-xs sm:text-sm leading-relaxed transition-all duration-300 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent-orange)] text-white rounded-br-none font-medium'
                    : 'bg-[var(--card-bg)] text-[var(--text-main)] rounded-bl-none'
                }`}
              >
                {/* Confidence Badge */}
                {msg.role === 'assistant' && msg.confidence && !msg.isThinking && (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/15 text-[10px] sm:text-[11px]">
                    <span className="font-bold text-[var(--accent-orange)]">ParcelPilot Agent</span>
                    <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-[var(--accent-orange)]">
                      Confidence: {msg.confidence}
                    </span>
                  </div>
                )}

                {/* Thinking Reasoning Loader */}
                {msg.isThinking ? (
                  <div className="flex items-center gap-2 py-1 text-xs text-[var(--accent-orange)] font-mono">
                    <span className="font-semibold">Reasoning over policy sources</span>
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-orange)] animate-bounce"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-orange)] animate-bounce [animation-delay:0.2s]"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-orange)] animate-bounce [animation-delay:0.4s]"></span>
                    </span>
                  </div>
                ) : (
                  /* Streamed Formatted Text */
                  <FormattedText content={msg.content} />
                )}

                {/* Tool Trace Text Chips */}
                {msg.toolTraces && msg.toolTraces.length > 0 && !msg.isThinking && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/15 space-y-1 text-xs">
                    <div className="text-[9px] sm:text-[10px] font-mono uppercase text-[var(--accent-orange)] font-semibold">
                      Executed Tools:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.toolTraces.map((trace, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono bg-[var(--panel-bg)] text-[var(--text-main)] transition-colors duration-200"
                        >
                          <span className="font-semibold text-[var(--accent-orange)]">{trace.toolName}()</span> — {trace.resultSummary}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Escalation Proposal Box */}
                {msg.proposalDraft && msg.proposalDraft.status === 'pending' && !msg.isThinking && (
                  <div className="mt-3 p-3.5 sm:p-4.5 rounded-2xl space-y-2.5 border border-[var(--accent-orange)]/40 bg-[var(--panel-bg)] shadow-sm">
                    <div className="text-xs font-bold text-[var(--accent-orange)] uppercase font-mono">
                      Pending Escalation Proposal ({msg.proposalDraft.proposal_id})
                    </div>
                    <div className="text-[11px] sm:text-xs font-mono text-[var(--text-sub)] space-y-1">
                      <div>Account: {msg.proposalDraft.account_id}</div>
                      {msg.proposalDraft.ticket_ref && <div>Reference: {msg.proposalDraft.ticket_ref}</div>}
                      <div>Reason: {msg.proposalDraft.reason}</div>
                      <div>Summary: {msg.proposalDraft.summary}</div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmProposal(msg.proposalDraft!.proposal_id)}
                        className="px-4 py-2 rounded-full bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-white text-[11px] sm:text-xs font-bold transition-all duration-300 shadow-md shadow-orange-500/20"
                      >
                        Confirm Escalation
                      </button>
                      <button
                        onClick={() => handleSend(`Cancel proposal ${msg.proposalDraft!.proposal_id}`)}
                        className="px-3 py-2 rounded-full text-[11px] sm:text-xs font-semibold text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Verification Test Query Pills */}
        <div className="shrink-0 space-y-1">
          <div className="text-[9px] sm:text-[10px] font-mono uppercase text-[var(--text-sub)]">
            Suggested Verification Queries:
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => handleSend('Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.')}
              className="text-[10.5px] sm:text-[11.5px] px-3.5 py-1.5 sm:py-2 rounded-full transition-all duration-300 ease-out bg-[var(--card-bg)] hover:bg-[var(--panel-bg)] text-[var(--text-main)] hover:text-[var(--accent-orange)] shadow-sm whitespace-nowrap"
            >
              "Can Northstar cancel ORD-1001 without a fee?"
            </button>

            <button
              onClick={() => handleSend('A pickup is three hours late on ORD-1001. Should I get a service credit?')}
              className="text-[10.5px] sm:text-[11.5px] px-3.5 py-1.5 sm:py-2 rounded-full transition-all duration-300 ease-out bg-[var(--card-bg)] hover:bg-[var(--panel-bg)] text-[var(--text-main)] hover:text-[var(--accent-orange)] shadow-sm whitespace-nowrap"
            >
              "Pickup 3 hours late on ORD-1001. Service credit?"
            </button>

            <button
              onClick={() => handleSend('Can LumenWorks cancel ORD-2001?')}
              className="text-[10.5px] sm:text-[11.5px] px-3.5 py-1.5 sm:py-2 rounded-full transition-all duration-300 ease-out bg-[var(--card-bg)] hover:bg-[var(--panel-bg)] text-[var(--text-main)] hover:text-[var(--accent-orange)] shadow-sm whitespace-nowrap"
            >
              "Can LumenWorks cancel ORD-2001?"
            </button>
          </div>
        </div>

        {/* Mobile & Desktop Responsive Input Bar */}
        <div className="shrink-0 relative pt-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask a question as ${selectedAccount.name}...`}
            className="w-full rounded-full px-5 sm:px-6 py-3 sm:py-3.5 pr-20 sm:pr-24 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]/50 transition-all duration-300 ease-out bg-[var(--card-bg)] text-[var(--text-main)] placeholder-[var(--text-sub)] shadow-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="absolute right-2 sm:right-2.5 top-2 sm:top-2.5 bottom-2 sm:bottom-2.5 px-4 sm:px-5 rounded-full bg-[var(--accent-orange)] text-white font-bold text-xs hover:bg-[var(--accent-orange-hover)] disabled:opacity-40 transition-all duration-300 ease-out shadow-md shadow-orange-500/20"
          >
            Send
          </button>
        </div>

      </main>
    </div>
  );
}
