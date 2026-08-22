import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ParcelPilot Support Agent | AI Logistics Operations',
    template: '%s | ParcelPilot Support',
  },
  description: 'Enterprise AI Customer Support Agent for ParcelPilot B2B logistics. Real-time SLA credit calculations, multi-tenant policy reasoning, and 2-phase escalation management.',
  keywords: [
    'ParcelPilot',
    'AI Support Agent',
    'B2B Logistics Platform',
    'Customer Operations AI',
    'Vercel AI SDK',
    'SLA Credit Calculator',
    'Next.js 16',
    'pgvector RAG',
    'Drizzle ORM',
    'Better Auth',
  ],
  authors: [{ name: 'Mayank Verma', url: 'https://github.com/MayankV004/calquity' }],
  creator: 'Mayank Verma',
  publisher: 'ParcelPilot Logistics Inc.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://parcelpilot.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'ParcelPilot AI Support Agent | Customer Operations Assistant',
    description: 'Enterprise AI Customer Support Agent for B2B logistics operations with 5-tier source authority reasoning and SLA breach resolution.',
    url: 'https://parcelpilot.vercel.app',
    siteName: 'ParcelPilot Support Agent',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ParcelPilot AI Support Agent',
    description: 'Autonomous B2B Logistics Customer Support Agent powered by Vercel AI SDK & pgvector.',
    creator: '@MayankVerma',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('parcelpilot_theme');
                  if (saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
