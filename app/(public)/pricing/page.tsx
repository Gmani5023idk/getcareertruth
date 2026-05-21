'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles, Menu } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import Logo from '@/components/ui/Logo';
import TiltCard from '@/components/animations/TiltCard';
import GlassCard from '@/components/animations/GlassCard';
import ScrollReveal from '@/components/animations/ScrollReveal';
import StickyNav from '@/components/animations/StickyNav';
import MobileMenu from '@/components/layout/mobile-menu';

export default function PricingPage() {
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
        <motion.div initial="initial" animate="animate" variants={fadeIn} className="text-center mb-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-6">Simple, Transparent Pricing</h1>
          <p className="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
            Pay only for the time you use. No subscriptions. No hidden fees.
          </p>
        </motion.div>

        <div className="max-w-md mx-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-surface border-2 border-primary rounded-[40px] p-10 shadow-accent relative overflow-hidden group hover:shadow-xl transition-shadow"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-white text-xs font-bold rounded-bl-xl">POPULAR</div>
            <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">15-Minute Truth Call</h3>
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
              className="w-full inline-flex items-center justify-center gap-2 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 hover:shadow-accent hover:-translate-y-0.5 transition-all group active:translate-y-0"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <p className="text-center text-text-secondary mt-8 sm:mt-12 text-sm">
          Are you a professional?          <Link href="/get-started" className="text-primary font-bold hover:text-accent transition-colors">Set your own rates →</Link>
        </p>
      </main>
    </div>
  );
}
