import React from 'react';

export default function Loading() {
  return (
    <div className="h-screen h-[100dvh] w-full flex flex-col items-center justify-center bg-[var(--bg-color)] text-[var(--text-main)] transition-colors duration-300 p-6 font-sans">
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Animated Brand Logo Icon */}
        <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-orange)]/20 via-transparent to-orange-500/10 animate-pulse" />
          
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="absolute w-12 h-12 rounded-full border-2 border-[var(--accent-orange)] border-t-transparent animate-spin" />
            <div className="w-4 h-4 rounded-full bg-[var(--accent-orange)] shadow-lg shadow-orange-500/50 animate-ping" />
          </div>
        </div>

        {/* Loading Text & Description */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">
            ParcelPilot <span className="text-[var(--accent-orange)]">Support</span>
          </h2>
          <p className="text-xs text-[var(--text-sub)] font-medium max-w-xs">
            Initializing AI Logistics Assistant & multi-tenant security policy engines...
          </p>
        </div>

        {/* Skeleton Bars */}
        <div className="w-full space-y-3 pt-4">
          <div className="h-2.5 w-3/4 mx-auto rounded-full bg-[var(--card-bg)] animate-pulse" />
          <div className="h-2 w-1/2 mx-auto rounded-full bg-[var(--card-bg)] animate-pulse [animation-delay:0.2s]" />
        </div>

        {/* Status Indicator Chip */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-sub)] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-orange)] animate-ping" />
          <span>Connecting to Vercel AI SDK Gateway</span>
        </div>

      </div>
    </div>
  );
}
