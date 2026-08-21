import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ParcelPilot Support Agent',
  description: 'Customer Operations Support Agent',
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
