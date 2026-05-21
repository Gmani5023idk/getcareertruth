'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Calendar, Zap, CheckCircle, ArrowRight, Clock, Sparkles, Menu } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import Logo from '@/components/ui/Logo';
import GlassCard from '@/components/animations/GlassCard';
import TiltCard from '@/components/animations/TiltCard';
import ScrollReveal from '@/components/animations/ScrollReveal';
import StickyNav from '@/components/animations/StickyNav';
import MobileMenu from '@/components/layout/mobile-menu';

export default function HowItWorksPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Navbar */}
      <StickyNav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[64px] sm:h-[72px]">
            <Logo />
            <div className="hidden md:flex items-center space-x-8">
              {[
                { name: 'How It Works', href: '/how-it-works' },
                { name: 'For Students', href: '/students' },
                { name: 'For Employees', href: '/for-employees' },
                { name: 'For Parents', href: '/parents' },
                { name: 'Pricing', href: '/pricing' },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-text-secondary hover:text-text-primary transition-all relative group"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full"></span>
                </Link>
              ))}
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Login
              </Link>
              <ThemeToggle />
              <Link
                href="/get-started"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary to-accent rounded-xl hover:shadow-accent transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Get Started
              </Link>
            </div>
            <div className="md:hidden flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => setIsMenuOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-border text-text-secondary hover:text-primary transition-all"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
            </div>
          </div>
        </div>
      </StickyNav>

      <main className="max-w-7xl mx-auto px-4 py-20">
        <ScrollReveal direction="up" duration={0.6}>
        <div className="text-center mb-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-6">How It Works</h1>
          <p className="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
            Three simple steps to bridge the gap between where you are and where you want to be.
          </p>        </div>
        </ScrollReveal>

        <div className="space-y-16 sm:space-y-24 md:space-y-32 max-w-4xl mx-auto mt-16 sm:mt-24 md:mt-32">
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
              className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 sm:gap-12 md:gap-16`}
            >
              <div className="flex-1">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#1A5FB4] to-[#00B4D8] text-4xl sm:text-5xl font-extrabold leading-none select-none mb-4 block">{item.step}</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">{item.title}</h2>
                <p className="text-text-secondary text-base sm:text-lg leading-relaxed">{item.desc}</p>
              </div>
              <TiltCard intensity={10} glare={false} className="w-48 h-48 rounded-[40px]">
              <div className="w-full h-full rounded-[40px] bg-surface border border-border flex items-center justify-center text-primary shadow-premium">
                {item.icon}
              </div>
            </TiltCard>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="mt-16 sm:mt-24 md:mt-40 text-center bg-gradient-to-br from-surface to-primary/[0.02] border border-border p-6 sm:p-10 md:p-16 rounded-2xl sm:rounded-3xl md:rounded-[40px] shadow-premium relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">Ready to find your truth?</h2>
          <p className="text-text-secondary mb-10 max-w-md mx-auto">{/* REMOVED: placeholder stat */}Join students who are already making smarter career decisions.</p>            <Link 
            href="/get-started" 
            className="inline-flex items-center gap-2 px-6 sm:px-10 py-4 sm:py-5 bg-primary text-white font-bold rounded-2xl hover:shadow-accent transition-all hover:-translate-y-0.5 active:translate-y-0 group"
          >
            Create Your Account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
