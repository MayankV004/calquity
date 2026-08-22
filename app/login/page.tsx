'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '@/app/components/AuthModal';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">ParcelPilot Support Agent</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Enterprise Authentication & Multi-Tenant Support Portal</p>
      </div>

      <AuthModal
        isOpen={true}
        onClose={() => router.push('/')}
        onSuccess={() => router.push('/')}
      />
    </div>
  );
}
