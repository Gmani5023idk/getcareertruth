'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import Logo from '@/components/ui/Logo';

export default function PricingPage() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <Logo showText={true} className="flex items-center" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary">Login</Link>
            <Link href="/get-started" className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-20">
        <motion.div initial="initial" animate="animate" variants={fadeIn} className="text-center mb-20">
          <h1 className="text-5xl font-black text-text-primary mb-6">Simple, Transparent Pricing</h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Pay only for the time you use. No subscriptions. No hidden fees.
          </p>
        </motion.div>

        <div className="max-w-md mx-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-surface border-2 border-primary rounded-[40px] p-10 shadow-accent relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-white text-xs font-bold rounded-bl-xl">POPULAR</div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">15-Minute Truth Call</h3>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-sm font-bold text-text-secondary uppercase tracking-wider">Starting at</span>
              <span className="text-4xl font-black text-text-primary">₹199</span>
              <span className="text-text-secondary">/ call</span>
            </div>
            
            <ul className="space-y-4 mb-10">
              {[
                'Direct access to verified experts',
                '15 minutes of unfiltered talk',
                'Secure payment processing',
                'Satisfaction guarantee',
                'Recordings available'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-text-secondary">
                  <CheckCircle className="w-5 h-5 text-accent" />
                  {item}
                </li>
              ))}
            </ul>

            <Link 
              href="/get-started" 
              className="w-full inline-flex items-center justify-center gap-2 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>

        <p className="text-center text-text-secondary mt-12 text-sm">
          Are you a professional? <Link href="/get-started" className="text-primary font-bold hover:underline">Set your own rates →</Link>
        </p>
      </main>
    </div>
  );
}
