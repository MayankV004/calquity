'use client';

import React, { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { LogIn, UserPlus, Lock, Mail, User, Building, CheckCircle2, AlertCircle, X } from 'lucide-react';

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
      // Attempt sign in or create demo account
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden text-[var(--foreground)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--header-bg)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-orange)]/20 border border-[var(--accent-orange)]/40 flex items-center justify-center text-[var(--accent-orange)]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold">ParcelPilot Authentication</h3>
              <p className="text-xs text-[var(--muted-foreground)]">Better Auth Enterprise Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-[var(--muted-foreground)] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[var(--border-color)] bg-black/20 p-1">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-[var(--accent-orange)] text-white shadow-md'
                : 'text-[var(--muted-foreground)] hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-[var(--accent-orange)] text-white shadow-md'
                : 'text-[var(--muted-foreground)] hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  required
                  placeholder="Mayank V."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-black/20 border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-orange)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="email"
                required
                placeholder="mayank@northstarlogistics.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-black/20 border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-orange)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-black/20 border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-orange)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 text-xs font-semibold rounded-xl bg-[var(--accent-orange)] hover:opacity-90 text-white transition-opacity flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" /> Sign In to Session
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Register & Authenticate
              </>
            )}
          </button>

          {/* Quick Demo Login Preset Buttons */}
          <div className="pt-3 border-t border-[var(--border-color)]">
            <p className="text-[11px] font-medium text-[var(--muted-foreground)] mb-2 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[var(--accent-orange)]" /> Quick Demo Session Switcher:
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoLogin('northstar@parcelpilot.com', 'Northstar Admin')}
                className="p-2 text-left text-[11px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <div className="font-semibold text-[var(--accent-orange)] truncate">Northstar</div>
                <div className="text-[9.5px] text-[var(--muted-foreground)] truncate">ACCT-001</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('lumenworks@parcelpilot.com', 'LumenWorks Manager')}
                className="p-2 text-left text-[11px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <div className="font-semibold text-blue-400 truncate">LumenWorks</div>
                <div className="text-[9.5px] text-[var(--muted-foreground)] truncate">ACCT-002</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('beacon@parcelpilot.com', 'Beacon Admin')}
                className="p-2 text-left text-[11px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <div className="font-semibold text-emerald-400 truncate">Beacon</div>
                <div className="text-[9.5px] text-[var(--muted-foreground)] truncate">ACCT-003</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
