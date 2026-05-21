import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/providers/SessionProvider';
import ThemeProvider from '@/components/providers/ThemeProvider';
import BottomNav from '@/components/layout/bottom-nav';
import SmoothScrollProvider from '@/components/animations/SmoothScrollProvider';
import RouteTransitionProvider from '@/components/animations/RouteTransitionProvider';
import ScrollProgressBar from '@/components/animations/ScrollProgressBar';
import ParticleBackground from '@/components/animations/ParticleBackground';

export const metadata: Metadata = {
  title: 'GetCareerTruth - Career advice you can actually trust',
  description: '15-minute real conversations with verified employees at your dream companies. No polished PR. No hidden agenda. Just unfiltered career truth.',
  manifest: '/manifest.json',
  icons: {
    apple: '/apple-icon.png',
  }
};

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body className="bg-bg text-text-primary selection:bg-primary/30 antialiased" suppressHydrationWarning>
        {/* Skip to Content for Accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only fixed top-4 left-4 z-[300] px-6 py-3 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-2xl"
        >
          Skip to main content
        </a>

        {/* Global scroll progress bar */}
        <ScrollProgressBar />

        {/* Subtle particle background */}
        <ParticleBackground particleCount={20} connectionDistance={100} speed={0.2} />

        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange={false}
          >
            <SmoothScrollProvider>
              <RouteTransitionProvider>
                <div className="flex flex-col min-h-screen relative z-10">
                  <main id="main-content" className="flex-1 pb-16 sm:pb-0">
                    {children}
                  </main>
                  
                  {/* Global Mobile Bottom Navigation */}
                  <BottomNav />
                </div>
              </RouteTransitionProvider>
            </SmoothScrollProvider>
          </ThemeProvider>
        </Providers>

        {/* Global Focus Ring Fix */}
        <style dangerouslySetInnerHTML={{ __html: `
          *:focus-visible {
            outline: none !important;
            box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-primary) !important;
          }
        `}} />
      </body>
    </html>
  );
}
