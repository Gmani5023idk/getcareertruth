'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Clock, Heart, Users, ArrowRight, Zap } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import Logo from '@/components/ui/Logo';

export default function ParentsPage() {
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
          <h1 className="text-5xl font-black text-text-primary mb-6">For Parents</h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Help your child make the right career choice with insights from professionals who know the industry.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
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
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }}
              className="p-8 bg-surface border border-border rounded-3xl hover:border-accent transition-all"
            >
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-4">{feature.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-32 text-center">
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
