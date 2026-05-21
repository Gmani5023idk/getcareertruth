'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Star, ArrowRight, Shield, Clock, Users, Zap, Search, Calendar, Award, Menu } from 'lucide-react';
import Image from 'next/image';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { motion } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import MobileMenu from '@/components/layout/mobile-menu';
import Card from '@/components/ui/Card';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg selection:bg-accent/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[64px] sm:h-[72px]">
            {/* Logo */}
            <Logo />

            {/* Desktop Nav */}
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
                  className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors relative group"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all group-hover:w-full"></span>
                </Link>
              ))}
            </div>

            {/* CTA Buttons */}
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
                className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary to-accent rounded-xl hover:shadow-accent transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Get Started
              </Link>
            </div>

            <div className="md:hidden flex items-center gap-3">
              <ThemeToggle />
              <div className="w-8 h-8 rounded-full overflow-hidden border border-border shadow-sm">
                <Image 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" 
                  alt="User" 
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
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
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-20 sm:pb-32 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 -z-10 hidden sm:block">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] opacity-20"></div>
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-accent/10 rounded-full blur-[100px] opacity-10"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 sm:gap-20">
            {/* Left Content */}
            <div className="flex-1 min-w-0 w-full">
              <motion.div 
                initial="initial"
                animate="animate"
                variants={staggerContainer}
                className="space-y-6 sm:space-y-8 text-center lg:text-left"
              >
                {/* Eyebrow */}
                <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-surface border border-border rounded-full shadow-premium">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                  <span className="text-[10px] sm:text-xs font-bold text-accent tracking-widest uppercase">Verified Professionals • Starting at ₹199</span>
                </motion.div>

                {/* Headline */}
                <motion.h1 variants={fadeIn} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-text-primary leading-[1.1] tracking-tight">
                  Career advice you can <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">actually trust.</span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p variants={fadeIn} className="text-lg sm:text-xl text-text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                  15-minute real conversations with verified employees at dream companies. 
                  <span className="block mt-2 text-text-primary">No polished PR. No hidden agenda. Just truth.</span>
                </motion.p>

                {/* CTA Buttons */}
                <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start w-full sm:w-auto px-4 sm:px-0">
                  <Link
                    href="/get-started"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-primary rounded-2xl hover:bg-primary-hover hover:shadow-accent transition-all transform hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto min-h-[56px] shadow-lg"
                  >
                    Join as Professional
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                  <Link
                    href="/employees"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-text-primary bg-surface border border-border rounded-2xl hover:bg-surface-2 transition-all group shadow-premium w-full sm:w-auto min-h-[56px]"
                  >
                    Find a Mentor
                    <Search className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 sm:py-32 bg-surface/30 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 sm:mb-24">
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-[10px] font-black text-accent tracking-[0.3em] uppercase mb-4"
            >
              THE REALITY
            </motion.p>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-5xl font-black text-text-primary mb-6 leading-tight"
            >
              The career advice system is <br className="hidden sm:block" /> <span className="text-accent underline decoration-accent/30 decoration-4 sm:decoration-8 underline-offset-8">broken.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text base sm:text-lg text-text-secondary max-w-2xl mx-auto font-medium"
            >
              Influencers and placement cells focus on metrics, not your happiness. 
              We're here to change that.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { title: 'Glamorised Advice', desc: 'Influencers sell dreams and high CTCs, not the actual daily grind.', icon: '🔥' },
              { title: 'Outdated Wisdom', desc: 'Faculty advice often lags 5-10 years behind current industry trends.', icon: '🕰️' },
              { title: 'Zero Verification', desc: 'LinkedIn is full of "ex-Googlers" who never actually worked there.', icon: '🛡️' },
              { title: 'Skills Gap', desc: 'College syllabus focuses on theory while companies hire for execution.', icon: '📚' },
              { title: 'Wasted Years', desc: 'Students spend 3 years chasing a career they end up hating in 3 months.', icon: '⏳' },
              { title: 'Hidden Network', desc: 'The best roles are filled via referrals you can\'t access without a connect.', icon: '🚪' },
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-3xl bg-surface border border-border hover:border-accent/50 hover:shadow-premium transition-all min-h-[220px]"
              >
                <div className="w-14 h-14 bg-bg rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-sm">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-text-primary mt-6 mb-3 group-hover:text-accent transition-colors">{item.title}</h3>
                <p className="text-text-secondary leading-relaxed text-sm font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 sm:py-24 px-4 border-t border-border bg-surface/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 sm:mb-20">
            <div className="col-span-1 lg:col-span-2 space-y-6 sm:space-y-8">
              <Logo className="-ml-1" />
              <p className="text-text-secondary text-base sm:text-lg max-w-sm leading-relaxed font-medium">
                Empowering the next generation with unfiltered, human career insights from people who've actually been there.
              </p>
              <div className="flex gap-4">
                {['twitter', 'linkedin', 'instagram'].map((social) => (
                  <div key={social} className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center hover:border-accent hover:text-accent transition-all cursor-pointer shadow-sm">
                    <div className="capitalize text-xs font-black tracking-widest">{social[0]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <h4 className="text-text-primary font-black text-xs uppercase tracking-[0.2em]">Platform</h4>
              <ul className="space-y-4">
                <li><Link href="/how-it-works" className="text-sm font-bold text-text-secondary hover:text-accent transition-colors">How It Works</Link></li>
                <li><Link href="/pricing" className="text-sm font-bold text-text-secondary hover:text-accent transition-colors">Pricing</Link></li>
                <li><Link href="/employees" className="text-sm font-bold text-text-secondary hover:text-accent transition-colors">Browse Professionals</Link></li>
                <li><Link href="/verify" className="text-sm font-bold text-text-secondary hover:text-accent transition-colors">Verification Process</Link></li>
              </ul>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <h4 className="text-text-primary font-black text-xs uppercase tracking-[0.2em]">Company</h4>
              <ul className="space-y-4">
                <li><Link href="/about" className="text-sm font-bold text-text-secondary hover:text-accent transition-colors">About Us</Link></li>
                <li><Link href="/careers" className="text-sm font-bold text-text-secondary hover:text-accent transition-colors">Careers</Link></li>
                <li><Link href="/privacy" className="text-sm font-bold text-text-secondary hover:text-accent transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm font-bold text-text-secondary hover:text-accent transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-text-secondary text-sm font-bold">
              © 2026 GetCareerTruth. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <p className="text-text-secondary text-xs font-black uppercase tracking-widest">
                 Made in India for the World
               </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
