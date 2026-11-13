import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Stokr | Sales & Inventory',
  description: 'Fast phone-first sales and inventory tracking for vape shops',
  icons: { apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Stokr', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { themeColor: '#0B1210', viewportFit: 'cover' };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
