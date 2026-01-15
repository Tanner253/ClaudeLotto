import type { Metadata, Viewport } from 'next';
import { Sora, JetBrains_Mono } from 'next/font/google';
import { WalletProvider } from '@/providers/WalletProvider';
import './globals.css';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Claude Lotto | Win Big with AI',
  description: 'Try to convince Claude to send you the prize money - the ultimate AI challenge',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body 
        className={`${sora.variable} ${jetbrainsMono.variable} font-sans antialiased h-full`} 
        suppressHydrationWarning
      >
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
