import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals-dark.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GetCareerTruth - Career advice you can actually trust',
  description: '15-minute real conversations with verified employees at your dream companies. No polished PR. No hidden agenda. Just unfiltered career truth.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-bg text-text-primary`}>
        {children}
      </body>
    </html>
  );
}