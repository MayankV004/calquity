'use client';

import React, { useState, useEffect, useRef } from 'react';
import AuthModal from '@/app/components/AuthModal';
import ChatSidebar, { ChatThread } from '@/app/components/ChatSidebar';
import { authClient } from '@/lib/auth-client';
import { Lock, LogOut, User, ArrowUp, PanelLeft, Sparkles } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>(`THREAD-${ACCOUNTS[0].id}-101`);
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

  // Sync selected account tab with active Better Auth user session
  useEffect(() => {
    if (session?.user?.email) {
      const email = session.user.email;
      if (email === 'northstar@parcelpilot.com') setSelectedAccount(ACCOUNTS[0]);
      else if (email === 'lumenworks@parcelpilot.com') setSelectedAccount(ACCOUNTS[1]);
      else if (email === 'beacon@parcelpilot.com') setSelectedAccount(ACCOUNTS[2]);
    }
  }, [session?.user?.email]);

  const handleSelectAccountTab = (acc: typeof ACCOUNTS[0]) => {
    if (!session?.user) {
      setSelectedAccount(acc);
      return;
    }

    const currentEmail = session.user.email;
    let authorizedAccountId = 'ACCT-001';
    if (currentEmail === 'lumenworks@parcelpilot.com') authorizedAccountId = 'ACCT-002';
    if (currentEmail === 'beacon@parcelpilot.com') authorizedAccountId = 'ACCT-003';

    if (authorizedAccountId !== acc.id) {
      setAuthModalOpen(true);
      return;
    }

    setSelectedAccount(acc);
  };

  // Load threads for the selected account (requires authentication)
  useEffect(() => {
    let isCancelled = false;
    const accountId = selectedAccount.id;

    if (!session?.user) {
      setThreads([]);
      setMessages([]);
      setInitialLoading(false);
      return;
    }

    async function loadAccountThreads() {
      // 1. Check API for database-backed threads
      try {
        const res = await fetch(`/api/chat/history?action=threads&account_id=${accountId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.threads && data.threads.length > 0 && !isCancelled) {
            setThreads(data.threads);
            const firstId = data.threads[0].id;
            setActiveThreadId(firstId);
            loadThreadMessages(accountId, firstId);
            return;
          }
        }
      } catch (err) {
        console.warn('API threads fetch warning:', err);
      }

      // 2. Check localStorage for account threads
      try {
        const savedThreads = localStorage.getItem(`parcelpilot_threads_${accountId}`);
        if (savedThreads && !isCancelled) {
          const parsed: ChatThread[] = JSON.parse(savedThreads);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setThreads(parsed);
            const firstId = parsed[0].id;
            setActiveThreadId(firstId);
            loadThreadMessages(accountId, firstId);
            return;
          }
        }
      } catch (e) {
        console.error('Error loading threads from localStorage:', e);
      }

      // 3. Initialize default thread for account
      if (!isCancelled) {
        const defaultThreadId = `THREAD-${accountId}-101`;
        const defaultThread: ChatThread = {
          id: defaultThreadId,
          title: `Welcome Conversation`,
          updatedAt: new Date().toISOString(),
        };
        setThreads([defaultThread]);
        setActiveThreadId(defaultThreadId);
        setMessages([getWelcomeMessage(selectedAccount)]);
        isLoadedRef.current = true;
        try {
          localStorage.setItem(`parcelpilot_threads_${accountId}`, JSON.stringify([defaultThread]));
        } catch {}
      }
    }

    setInitialLoading(true);
    loadAccountThreads().finally(() => {
      if (!isCancelled) setTimeout(() => setInitialLoading(false), 200);
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedAccount, session?.user]);

  // Function to load messages for a specific thread
  const loadThreadMessages = async (accountId: string, threadId: string) => {
    if (!session?.user) return;

    // Reset view to welcome message immediately while loading
    setMessages([getWelcomeMessage(selectedAccount)]);

    // Try DB fetch
    try {
      const res = await fetch(`/api/chat/history?account_id=${accountId}&thread_id=${threadId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
          isLoadedRef.current = true;
          return;
        }
      }
    } catch (e) {
      console.warn('API thread messages fetch warning:', e);
    }

    // Try LocalStorage
    try {
      const saved = localStorage.getItem(`parcelpilot_msgs_${accountId}_${threadId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          isLoadedRef.current = true;
          return;
        }
      }
    } catch (e) {
      console.error('Error loading thread messages:', e);
    }

    setMessages([getWelcomeMessage(selectedAccount)]);
    isLoadedRef.current = true;
  };

  // Persist messages to active thread in localStorage
  useEffect(() => {
    if (!isLoadedRef.current || !activeThreadId || !session?.user) return;
    try {
      localStorage.setItem(`parcelpilot_msgs_${selectedAccount.id}_${activeThreadId}`, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving thread history:', e);
    }
  }, [messages, selectedAccount, activeThreadId, session?.user]);

  // Handle selecting a thread from sidebar (no auto-closing on desktop/mobile)
  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    loadThreadMessages(selectedAccount.id, threadId);
  };

  // Handle starting a new thread (no auto-closing on desktop/mobile)
  const handleNewThread = () => {
    if (!session?.user) {
      setAuthModalOpen(true);
      return;
    }

    const newThreadId = `THREAD-${selectedAccount.id}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newThread: ChatThread = {
      id: newThreadId,
      title: 'New Conversation',
      updatedAt: new Date().toISOString(),
    };

    const updatedThreads = [newThread, ...threads];
    setThreads(updatedThreads);
    setActiveThreadId(newThreadId);
    setMessages([getWelcomeMessage(selectedAccount)]);
    isLoadedRef.current = true;

    try {
      localStorage.setItem(`parcelpilot_threads_${selectedAccount.id}`, JSON.stringify(updatedThreads));
    } catch (e) {
      console.error('Error saving threads:', e);
    }
  };

  // Handle deleting a single thread
  const handleDeleteThread = async (threadId: string) => {
    const updatedThreads = threads.filter((t) => t.id !== threadId);
    setThreads(updatedThreads);

    try {
      localStorage.removeItem(`parcelpilot_msgs_${selectedAccount.id}_${threadId}`);
      localStorage.setItem(`parcelpilot_threads_${selectedAccount.id}`, JSON.stringify(updatedThreads));
      await fetch(`/api/chat/history?thread_id=${threadId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Delete thread error:', e);
    }

    if (activeThreadId === threadId) {
      if (updatedThreads.length > 0) {
        handleSelectThread(updatedThreads[0].id);
      } else {
        handleNewThread();
      }
    }
  };

  // Handle clearing all threads for active account
  const handleClearAllThreads = async () => {
    try {
      await fetch(`/api/chat/history?account_id=${selectedAccount.id}`, { method: 'DELETE' });
      threads.forEach((t) => localStorage.removeItem(`parcelpilot_msgs_${selectedAccount.id}_${t.id}`));
      localStorage.removeItem(`parcelpilot_threads_${selectedAccount.id}`);
    } catch (e) {
      console.warn('Clear all threads error:', e);
    }

    const defaultId = `THREAD-${selectedAccount.id}-101`;
    const defaultThread: ChatThread = {
      id: defaultId,
      title: 'Welcome Conversation',
      updatedAt: new Date().toISOString(),
    };
    setThreads([defaultThread]);
    setActiveThreadId(defaultId);
    setMessages([getWelcomeMessage(selectedAccount)]);
  };

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

  const handleClearHistory = async () => {
    if (!session?.user) return;
    try {
      await fetch('/api/chat/history', { method: 'DELETE' });
    } catch (e) {
      console.warn('API clear history warning:', e);
    }
    localStorage.removeItem(`parcelpilot_msgs_${selectedAccount.id}`);
    setMessages([getWelcomeMessage(selectedAccount)]);
  };

  const handleSend = async (queryText?: string) => {
    if (!session?.user) {
      setAuthModalOpen(true);
      return;
    }

    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    // Auto-update thread title if default
    const currentThread = threads.find((t) => t.id === activeThreadId);
    if (currentThread && (currentThread.title === 'New Conversation' || currentThread.title === 'Welcome Conversation')) {
      const newTitle = textToSend.slice(0, 30) + (textToSend.length > 30 ? '...' : '');
      const updatedThreads = threads.map((t) => (t.id === activeThreadId ? { ...t, title: newTitle } : t));
      setThreads(updatedThreads);
      try {
        localStorage.setItem(`parcelpilot_threads_${selectedAccount.id}`, JSON.stringify(updatedThreads));
      } catch {}
    }

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
          thread_id: activeThreadId,
          session_id: activeThreadId,
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
        <div className="max-w-sm w-full flex flex-col items-center text-center space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold tracking-tight">
              ParcelPilot <span className="text-[var(--accent-orange)]">Support</span>
            </h2>
            <p className="text-xs text-[var(--text-sub)] font-medium">
              Loading {selectedAccount.name}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] max-h-screen w-full overflow-hidden flex flex-row font-sans transition-colors duration-300 ease-out bg-[var(--bg-color)] text-[var(--text-main)]">
      
      {/* Account Chat Sessions Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedAccount={selectedAccount}
        threads={threads}
        activeThreadId={activeThreadId}
        isAuthenticated={Boolean(session?.user)}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
        onClearAllThreads={handleClearAllThreads}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Full-Screen Viewport */}
      <div className="flex-1 flex flex-col min-w-0 w-full h-full overflow-hidden">

        {/* Clean Mobile-Responsive Header */}
        <header className="shrink-0 w-full px-3 sm:px-6 py-2.5 sm:py-3 transition-all bg-[var(--bg-color)] border-b border-zinc-800/15">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
            
            {/* Row 1: App Title & Mobile Quick Actions */}
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-semibold bg-[var(--card-bg)] text-[var(--text-main)] border border-zinc-800/15 hover:bg-[var(--panel-bg)] transition-all shrink-0 font-mono"
                title="Toggle Sidebar"
              >
                ≡ Threads
              </button>

              <div className="truncate">
                <h1 className="text-sm sm:text-lg font-bold tracking-tight flex items-center gap-1.5 sm:gap-2 truncate">
                  <span className="truncate">ParcelPilot <span className="text-[var(--accent-orange)]">AI</span></span>
                  <span className="text-[9.5px] sm:text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] border border-[var(--accent-orange)]/30 shrink-0">
                    {selectedAccount.shortName}
                  </span>
                </h1>
              </div>

              {/* Mobile Header Quick Actions */}
              <div className="flex sm:hidden items-center gap-1.5 ml-auto shrink-0">
                <button
                  onClick={toggleTheme}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[var(--card-bg)] text-[var(--text-main)] border border-zinc-800/15"
                >
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
                {session?.user ? (
                  <button
                    onClick={() => authClient.signOut()}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[var(--accent-orange)] text-white shadow-sm"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>

            {/* Row 2 / Desktop Right: Account Switcher Tabs & Desktop Controls */}
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar py-0.5">
              <div className="flex items-center p-1 rounded-full bg-[var(--card-bg)] whitespace-nowrap border border-zinc-800/15 overflow-x-auto no-scrollbar">
                {ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectAccountTab(acc)}
                    className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedAccount.id === acc.id
                        ? 'bg-[var(--accent-orange)] text-white shadow-sm'
                        : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span>{acc.shortName}</span>
                  </button>
                ))}
              </div>

              {/* Desktop Theme Switcher */}
              <button
                onClick={toggleTheme}
                className="hidden sm:block px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all bg-[var(--card-bg)] text-[var(--text-main)] hover:bg-[var(--panel-bg)] whitespace-nowrap border border-zinc-800/15"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>

              {/* Desktop Auth Button */}
              {session?.user ? (
                <button
                  onClick={() => authClient.signOut()}
                  className="hidden sm:flex px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-all whitespace-nowrap"
                  title={`Logged in as ${session.user.email}`}
                >
                  Sign Out ({session.user.name || session.user.email.split('@')[0]})
                </button>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="hidden sm:flex px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent-orange)] text-white hover:opacity-90 transition-all shadow-sm whitespace-nowrap"
                >
                  Sign In
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

        {/* Full-Width Canvas Center Area */}
        <main className="flex-1 min-h-0 w-full flex flex-col justify-between items-center overflow-hidden">
          
          {/* Active Account Banner */}
          <div className="max-w-4xl w-full px-3 sm:px-4 pt-2 sm:pt-3 pb-1 shrink-0">
            <div className="py-2 sm:py-2.5 px-3.5 sm:px-5 rounded-full flex flex-row items-center justify-between text-[11px] sm:text-xs transition-all bg-[var(--card-bg)] text-[var(--text-main)] border border-zinc-800/15 shadow-2xs gap-2">
              <div className="truncate flex-1">
                <span className="font-bold text-[var(--accent-orange)]">{selectedAccount.name}</span> <span className="text-[var(--text-sub)]">({selectedAccount.id})</span> • Plan: <span className="font-semibold text-[var(--accent-orange)]">{selectedAccount.tier}</span> <span className="hidden md:inline">• CSM: {selectedAccount.csm}</span>
              </div>
              <div className="font-mono text-[var(--text-sub)] text-[10px] sm:text-[11px] shrink-0">
                Snapshot: 2026-08-16
              </div>
            </div>
          </div>

          {/* Unauthenticated Sign-In View OR Chat Stream */}
          {!session?.user ? (
            <div className="max-w-md w-[92%] sm:w-full my-auto mx-auto p-5 sm:p-8 rounded-3xl bg-[var(--card-bg)] border border-zinc-800/20 text-center space-y-4 shadow-xl">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
                Sign In Required
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-sub)] leading-relaxed">
                Please sign in to access your account&apos;s ParcelPilot AI support assistant and view your saved conversation threads.
              </p>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-full py-2.5 sm:py-3 px-4 rounded-full bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-white text-xs font-bold transition-all shadow-sm"
              >
                Sign In First
              </button>
            </div>
          ) : (
            <div className="max-w-4xl w-full flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-2 sm:py-3 space-y-4 sm:space-y-5 no-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}>
                  
                  {msg.role === 'user' ? (
                    /* User Query Bubble */
                    <div className="max-w-[90%] sm:max-w-xl rounded-3xl rounded-tr-sm px-3.5 sm:px-4.5 py-2.5 sm:py-3 text-xs sm:text-sm leading-relaxed bg-[var(--panel-bg)] text-[var(--text-main)] border border-zinc-800/20 font-medium shadow-xs break-words">
                      {msg.content}
                    </div>
                  ) : (
                    /* Assistant Iconless Response Card */
                    <div className="w-full bg-[var(--card-bg)] rounded-3xl p-3.5 sm:p-5 text-xs sm:text-sm leading-relaxed text-[var(--text-main)] border border-zinc-800/15 shadow-xs space-y-2 border-l-4 border-l-[var(--accent-orange)] break-words">
                      
                      {/* Confidence Header */}
                      {msg.confidence && !msg.isThinking && (
                        <div className="flex items-center justify-between pb-2 mb-1 border-b border-zinc-800/15 text-[10px] sm:text-[11px]">
                          <span className="font-bold text-[var(--accent-orange)]">ParcelPilot Agent</span>
                          <span className="font-mono text-[9px] sm:text-[10px] uppercase font-bold text-[var(--accent-orange)]">
                            Confidence: {msg.confidence}
                          </span>
                        </div>
                      )}

                      {/* Reasoning State */}
                      {msg.isThinking ? (
                        <div className="flex items-center gap-2 py-1 text-xs text-[var(--accent-orange)] font-mono">
                          <span className="font-semibold">Reasoning over policy sources...</span>
                        </div>
                      ) : (
                        <FormattedText content={msg.content} />
                      )}

                      {/* Tool Traces */}
                      {msg.toolTraces && msg.toolTraces.length > 0 && !msg.isThinking && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-800/15 space-y-1 text-xs">
                          <div className="text-[10px] font-mono uppercase text-[var(--accent-orange)] font-semibold">
                            Executed Tools:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {msg.toolTraces.map((trace, idx) => (
                              <div
                                key={idx}
                                className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[10.5px] font-mono bg-[var(--panel-bg)] text-[var(--text-main)] transition-colors border border-zinc-800/20"
                              >
                                <span className="font-semibold text-[var(--accent-orange)]">{trace.toolName}()</span> — {trace.resultSummary}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Escalation Proposal Box */}
                      {msg.proposalDraft && msg.proposalDraft.status === 'pending' && !msg.isThinking && (
                        <div className="mt-3 p-3 sm:p-4 rounded-2xl space-y-2 border border-[var(--accent-orange)]/40 bg-[var(--panel-bg)] shadow-xs">
                          <div className="text-[11px] sm:text-xs font-bold text-[var(--accent-orange)] uppercase font-mono">
                            Pending Escalation Proposal ({msg.proposalDraft.proposal_id})
                          </div>
                          <div className="text-[11px] sm:text-xs font-mono text-[var(--text-sub)] space-y-1 break-words">
                            <div>Account: {msg.proposalDraft.account_id}</div>
                            {msg.proposalDraft.ticket_ref && <div>Reference: {msg.proposalDraft.ticket_ref}</div>}
                            <div>Reason: {msg.proposalDraft.reason}</div>
                            <div>Summary: {msg.proposalDraft.summary}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              onClick={() => handleConfirmProposal(msg.proposalDraft!.proposal_id)}
                              className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-white text-[11px] sm:text-xs font-bold transition-all shadow-sm"
                            >
                              Confirm Escalation
                            </button>
                            <button
                              onClick={() => handleSend(`Cancel proposal ${msg.proposalDraft!.proposal_id}`)}
                              className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Mobile-Optimized Centered Floating Bottom Input */}
          <div className="max-w-4xl w-full px-3 sm:px-4 pb-4 sm:pb-6 pt-1.5 sm:pt-2 shrink-0 space-y-1.5 sm:space-y-2 bg-[var(--bg-color)]/95 backdrop-blur-md">
            
            {/* Quick Prompt Pills (Horizontal Scroll on Mobile) */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => handleSend('Can Northstar cancel ORD-1001 without a cancellation fee? Explain why.')}
                className="text-[11px] sm:text-xs px-3 sm:px-4 py-1 sm:py-1.5 rounded-full transition-all bg-[var(--card-bg)] hover:bg-[var(--panel-bg)] text-[var(--text-main)] hover:text-[var(--accent-orange)] whitespace-nowrap border border-zinc-800/15 shrink-0 font-medium"
              >
                &quot;Can Northstar cancel ORD-1001 without a fee?&quot;
              </button>

              <button
                onClick={() => handleSend('A pickup is three hours late on ORD-1001. Should I get a service credit?')}
                className="text-[11px] sm:text-xs px-3 sm:px-4 py-1 sm:py-1.5 rounded-full transition-all bg-[var(--card-bg)] hover:bg-[var(--panel-bg)] text-[var(--text-main)] hover:text-[var(--accent-orange)] whitespace-nowrap border border-zinc-800/15 shrink-0 font-medium"
              >
                &quot;Pickup 3 hours late on ORD-1001. Service credit?&quot;
              </button>

              <button
                onClick={() => handleSend('Can LumenWorks cancel ORD-2001?')}
                className="text-[11px] sm:text-xs px-3 sm:px-4 py-1 sm:py-1.5 rounded-full transition-all bg-[var(--card-bg)] hover:bg-[var(--panel-bg)] text-[var(--text-main)] hover:text-[var(--accent-orange)] whitespace-nowrap border border-zinc-800/15 shrink-0 font-medium"
              >
                &quot;Can LumenWorks cancel ORD-2001?&quot;
              </button>
            </div>

            {/* Floating Input Container */}
            <div
              onClick={() => !session?.user && setAuthModalOpen(true)}
              className="relative flex items-center bg-[var(--card-bg)] rounded-full p-1.5 sm:p-2 border border-zinc-800/25 shadow-lg focus-within:ring-2 focus-within:ring-[var(--accent-orange)]/40 transition-all cursor-text"
            >
              <input
                type="text"
                value={input}
                readOnly={!session?.user}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={session?.user ? `Ask ParcelPilot as ${selectedAccount.name}...` : 'Sign in first to ask ParcelPilot...'}
                className="w-full bg-transparent px-3 sm:px-5 text-xs sm:text-base focus:outline-none text-[var(--text-main)] placeholder-[var(--text-sub)] font-normal"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim() || !session?.user}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-white font-bold text-xs disabled:opacity-30 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all shrink-0 shadow-sm"
                title="Send message"
              >
                Send
              </button>
            </div>

            <div className="text-[9.5px] sm:text-[10px] text-center text-[var(--text-sub)] font-medium font-mono">
              ParcelPilot AI Operations Agent • Multi-Tenant Enterprise Security
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
