'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Calendar, Zap, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import Logo from '@/components/ui/Logo';

export default function HowItWorksPage() {
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
          <h1 className="text-5xl font-black text-text-primary mb-6">How It Works</h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Three simple steps to bridge the gap between where you are and where you want to be.
          </p>
        </motion.div>

        <div className="space-y-32 max-w-4xl mx-auto mt-32">
          {[
            {
              step: '01',
              title: 'Browse Verified Professionals',
              desc: 'Search by role, company, or industry. Every mentor on our platform is verified through their professional credentials.',
              icon: <Search className="w-10 h-10" />
            },
            {
              step: '02',
              title: 'Schedule a 15-Minute Call',
              desc: 'Pick a time slot that works for both of you. Our streamlined booking process handles all the logistics.',
              icon: <Calendar className="w-10 h-10" />
            },
            {
              step: '03',
              title: 'Gain Real-World Insights',
              desc: 'Ask your burning questions and get unfiltered advice. No scripts, no sugar-coating—just the truth.',
              icon: <Zap className="w-10 h-10" />
            }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-16`}
            >
              <div className="flex-1">
                <span className="text-6xl font-black text-primary/20 mb-4 block">{item.step}</span>
                <h2 className="text-3xl font-bold text-text-primary mb-6">{item.title}</h2>
                <p className="text-text-secondary text-lg leading-relaxed">{item.desc}</p>
              </div>
              <div className="w-48 h-48 rounded-[40px] bg-surface border border-border flex items-center justify-center text-primary shadow-premium">
                {item.icon}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="mt-40 text-center bg-surface border border-border p-16 rounded-[40px] shadow-premium">
          <h2 className="text-3xl font-bold text-text-primary mb-6">Ready to find your truth?</h2>
          <p className="text-text-secondary mb-10 max-w-md mx-auto">{/* REMOVED: placeholder stat */}Join students who are already making smarter career decisions.</p>
          <Link 
            href="/get-started" 
            className="inline-flex items-center gap-2 px-10 py-5 bg-primary text-white font-bold rounded-2xl hover:shadow-accent transition-all"
          >
            Create Your Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
