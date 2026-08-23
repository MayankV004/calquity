'use client';

import React from 'react';

export interface ChatThread {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAccount: { id: string; name: string; shortName: string; tier: string };
  threads: ChatThread[];
  activeThreadId: string;
  isAuthenticated: boolean;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onClearAllThreads: () => void;
  onOpenAuth: () => void;
}

export default function ChatSidebar({
  isOpen,
  onClose,
  selectedAccount,
  threads,
  activeThreadId,
  isAuthenticated,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onClearAllThreads,
  onOpenAuth,
}: ChatSidebarProps) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sleek Rounded-Full Sidebar Container */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 flex flex-col justify-between transition-all duration-300 ease-in-out bg-[var(--card-bg)] border-r border-zinc-800/15 shrink-0 shadow-xl lg:shadow-none overflow-hidden ${
          isOpen
            ? 'w-72 sm:w-80 opacity-100 translate-x-0'
            : 'w-0 lg:w-0 opacity-0 -translate-x-full lg:translate-x-0 border-r-0 pointer-events-none'
        }`}
      >
        <div className="w-72 sm:w-80 flex flex-col h-full justify-between">
          
          {/* Top Sidebar Header */}
          <div className="p-4 border-b border-zinc-800/15 flex items-center justify-between shrink-0">
            <div className="truncate">
              <h3 className="text-xs font-bold truncate text-[var(--text-main)]">
                {selectedAccount.name}
              </h3>
              <p className="text-[10px] text-[var(--text-sub)] font-mono">
                {selectedAccount.id} • {selectedAccount.tier}
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-3 py-1 rounded-full text-[11px] font-semibold text-[var(--text-sub)] hover:text-[var(--text-main)] bg-[var(--panel-bg)] border border-zinc-800/15 transition-colors"
              title="Collapse Sidebar"
            >
              Hide
            </button>
          </div>

          {/* New Chat Button */}
          {isAuthenticated && (
            <div className="p-3 shrink-0">
              <button
                onClick={onNewThread}
                className="w-full py-2.5 px-4 rounded-full bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-white text-xs font-bold transition-all duration-200 shadow-sm"
              >
                + New Chat
              </button>
            </div>
          )}

          {/* Account Threads List / Unauthenticated State */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5 no-scrollbar">
            {!isAuthenticated ? (
              <div className="p-5 rounded-3xl bg-[var(--panel-bg)] border border-zinc-800/20 text-center space-y-3 my-2">
                <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                  Sign in to view saved conversation threads for {selectedAccount.shortName}.
                </p>
                <button
                  onClick={onOpenAuth}
                  className="w-full py-2.5 px-4 rounded-full bg-[var(--accent-orange)] text-white text-xs font-bold hover:opacity-90 transition-all shadow-sm"
                >
                  Sign In First
                </button>
              </div>
            ) : (
              <>
                <div className="text-[10px] font-mono uppercase text-[var(--text-sub)] px-2 mb-2 font-bold tracking-wider flex items-center justify-between">
                  <span>Past Threads ({threads.length})</span>
                  {threads.length > 0 && (
                    <button
                      onClick={onClearAllThreads}
                      className="hover:text-red-400 transition-colors lowercase text-[10px] font-normal"
                    >
                      clear all
                    </button>
                  )}
                </div>

                {threads.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-sub)] font-medium italic">
                    No active threads. Click &quot;+ New Chat&quot; to begin.
                  </div>
                ) : (
                  threads.map((t) => {
                    const isActive = t.id === activeThreadId;
                    return (
                      <div
                        key={t.id}
                        onClick={() => onSelectThread(t.id)}
                        className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs transition-all duration-200 cursor-pointer border ${
                          isActive
                            ? 'bg-[var(--accent-orange)]/15 border-[var(--accent-orange)]/50 text-[var(--text-main)] font-semibold'
                            : 'bg-transparent border-transparent hover:bg-[var(--panel-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <span className="truncate text-[11.5px] sm:text-xs pr-3">
                          {t.title || `Thread ${t.id}`}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteThread(t.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 hover:text-red-400 font-mono transition-all px-1.5 py-0.5 rounded-full hover:bg-zinc-800/40"
                        >
                          delete
                        </button>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-zinc-800/15 text-[10px] text-[var(--text-sub)] text-center font-mono shrink-0">
            ParcelPilot AI • Account Scoped
          </div>

        </div>
      </aside>
    </>
  );
}
