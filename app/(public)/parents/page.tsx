'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, Heart, Users, ArrowRight, Zap, Sparkles, Menu } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import Logo from '@/components/ui/Logo';
import TiltCard from '@/components/animations/TiltCard';
import ScrollReveal from '@/components/animations/ScrollReveal';
import StickyNav from '@/components/animations/StickyNav';
import MobileMenu from '@/components/layout/mobile-menu';

export default function ParentsPage() {
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-6">For Parents</h1>
          <p className="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
            Help your child make the right career choice with insights from professionals who know the industry.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              title: 'Peace of Mind',
              desc: 'Ensure your child is moving in the right direction with advice from verified industry professionals.',
              icon: <Heart className="w-6 h-6" />
            },
            {
              title: 'Safety First',
              desc: 'All our mentors are verified through strict background checks. Safe and professional environment.',
              icon: <Shield className="w-6 h-6" />
            },
            {
              title: 'ROI Focused',
              desc: 'Make sure your investment in your child\'s education leads to a fulfilling and successful career.',
              icon: <Clock className="w-6 h-6" />
            }
          ].map((feature, i) => (
            <TiltCard key={i} intensity={6} glare={false} className="h-full">
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-surface border border-border rounded-3xl hover:border-accent transition-all h-full group"
              >
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-4">{feature.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            </TiltCard>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16 sm:mt-24 md:mt-32 text-center">
          <Link 
            href="/get-started" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-2xl hover:shadow-accent transition-all"
          >
            Start Your Child's Journey
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
