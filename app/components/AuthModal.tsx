'use client';

import React, { useState } from 'react';
import { authClient } from '@/lib/auth-client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signup') {
        const { data, error: err } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
        });

        if (err) {
          setError(err.message || 'Failed to create account.');
        } else {
          setSuccessMsg('Account created successfully! You are now logged in.');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1200);
        }
      } else {
        const { data, error: err } = await authClient.signIn.email({
          email,
          password,
        });

        if (err) {
          setError(err.message || 'Invalid email or password.');
        } else {
          setSuccessMsg('Signed in successfully!');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1000);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoName: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await authClient.signIn.email({
        email: demoEmail,
        password: 'Password123!',
      });

      if (err) {
        await authClient.signUp.email({
          email: demoEmail,
          password: 'Password123!',
          name: demoName,
        });
      }

      setSuccessMsg(`Authenticated as ${demoName}!`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (e: any) {
      setError('Demo login failed: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      {/* Modal Container matching App Theme */}
      <div className="relative w-full max-w-md bg-[var(--card-bg)] text-[var(--text-main)] border border-zinc-800/15 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[var(--text-main)]">
              ParcelPilot <span className="text-[var(--accent-orange)]">AI</span>
            </h3>
            <p className="text-xs text-[var(--text-sub)] font-medium mt-0.5">
              Enterprise Support Authentication
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--panel-bg)] hover:bg-[var(--bg-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-zinc-800/15 transition-all"
          >
            Close
          </button>
        </div>

        {/* Animated Sliding Tab Switcher */}
        <div className="relative flex p-1 rounded-full bg-[var(--panel-bg)] border border-zinc-800/15 select-none">
          {/* Sliding Active Pill Background */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[var(--accent-orange)] transition-all duration-300 ease-out shadow-sm ${
              mode === 'signin' ? 'left-1' : 'left-[calc(50%+3px)]'
            }`}
          />
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`relative z-10 flex-1 py-2 rounded-full text-xs font-bold transition-colors duration-300 text-center ${
              mode === 'signin' ? 'text-white' : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`relative z-10 flex-1 py-2 rounded-full text-xs font-bold transition-colors duration-300 text-center ${
              mode === 'signup' ? 'text-white' : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 text-xs rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-center font-medium transition-all">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 text-xs rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center font-medium transition-all">
              {successMsg}
            </div>
          )}

          {/* Smooth Expanding Full Name Input Field */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              mode === 'signup'
                ? 'max-h-24 opacity-100 translate-y-0'
                : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <div className="space-y-1 pb-1">
              <label className="block text-xs font-semibold text-[var(--text-sub)] px-3">Full Name</label>
              <input
                type="text"
                required={mode === 'signup'}
                placeholder="Mayank V."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-3 text-xs sm:text-sm rounded-full bg-[var(--panel-bg)] border border-zinc-800/20 text-[var(--text-main)] placeholder-[var(--text-sub)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]/40 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[var(--text-sub)] px-3">Work Email</label>
            <input
              type="email"
              required
              placeholder="mayank@northstarlogistics.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3 text-xs sm:text-sm rounded-full bg-[var(--panel-bg)] border border-zinc-800/20 text-[var(--text-main)] placeholder-[var(--text-sub)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]/40 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[var(--text-sub)] px-3">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 text-xs sm:text-sm rounded-full bg-[var(--panel-bg)] border border-zinc-800/20 text-[var(--text-main)] placeholder-[var(--text-sub)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]/40 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 text-xs sm:text-sm font-bold rounded-full bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-white shadow-sm transition-all duration-300 disabled:opacity-40"
          >
            {loading ? 'Authenticating...' : mode === 'signin' ? 'Sign In to Session' : 'Register & Authenticate'}
          </button>

          {/* Quick Demo Login Presets */}
          <div className="pt-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-[var(--text-sub)] px-2 text-center">
              Quick Demo Accounts:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('northstar@parcelpilot.com', 'Northstar Admin')}
                className="py-2.5 px-3 text-center rounded-full bg-[var(--panel-bg)] hover:bg-[var(--bg-color)] border border-zinc-800/15 transition-all group"
              >
                <div className="text-[11px] font-bold text-[var(--accent-orange)] truncate">Northstar</div>
                <div className="text-[9px] text-[var(--text-sub)] truncate">ACCT-001</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('lumenworks@parcelpilot.com', 'LumenWorks Manager')}
                className="py-2.5 px-3 text-center rounded-full bg-[var(--panel-bg)] hover:bg-[var(--bg-color)] border border-zinc-800/15 transition-all group"
              >
                <div className="text-[11px] font-bold text-blue-400 truncate">LumenWorks</div>
                <div className="text-[9px] text-[var(--text-sub)] truncate">ACCT-002</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('beacon@parcelpilot.com', 'Beacon Admin')}
                className="py-2.5 px-3 text-center rounded-full bg-[var(--panel-bg)] hover:bg-[var(--bg-color)] border border-zinc-800/15 transition-all group"
              >
                <div className="text-[11px] font-bold text-emerald-400 truncate">Beacon</div>
                <div className="text-[9px] text-[var(--text-sub)] truncate">ACCT-003</div>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
