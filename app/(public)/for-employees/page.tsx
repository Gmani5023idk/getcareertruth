'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Users, DollarSign, Clock, ArrowRight, Briefcase, Sparkles, Heart, Menu } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import Logo from '@/components/ui/Logo';
import TiltCard from '@/components/animations/TiltCard';
import GlassCard from '@/components/animations/GlassCard';
import ScrollReveal from '@/components/animations/ScrollReveal';
import StickyNav from '@/components/animations/StickyNav';
import MobileMenu from '@/components/layout/mobile-menu';

export default function ForEmployeesPage() {
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-6 tracking-tight">
            Share your truth. <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Get paid for it.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
            Join a community of verified professionals helping students navigate their careers with real, unfiltered advice.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              title: 'Earn on Your Terms',
              desc: 'Set your own price per call (₹99–₹999+). 15-minute conversations that value your time and expertise.',
              icon: <DollarSign className="w-6 h-6" />
            },
            {
              title: 'Build Your Brand',
              desc: 'Get a "Verified Professional" badge. Showcase your journey and build authority as a mentor in your industry.',
              icon: <Shield className="w-6 h-6" />
            },
            {
              title: 'Flexible Schedule',
              desc: 'No commitments. Open slots when you want, close them when you are busy. You are in total control.',
              icon: <Clock className="w-6 h-6" />
            }
          ].map((feature, i) => (
            <TiltCard key={i} intensity={6} glare={false} className="h-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-surface border border-border rounded-3xl hover:border-accent transition-all group h-full"
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

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          whileInView={{ opacity: 1, scale: 1 }} 
          className="mt-16 sm:mt-24 md:mt-32 p-6 sm:p-10 md:p-12 bg-gradient-to-br from-primary to-accent rounded-2xl sm:rounded-3xl md:rounded-[40px] text-center text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Ready to mentor the next generation?</h2>
          <p className="text-white/80 mb-10 max-w-xl mx-auto">
            It takes less than 5 minutes to set up your profile and start helping students find their career truth.
          </p>
          <Link 
            href="/signup/employee" 
            className="inline-flex items-center gap-2 px-6 sm:px-10 py-4 sm:py-5 bg-white text-primary font-bold rounded-2xl hover:scale-105 transition-all shadow-xl"
          >
            Create Your Mentor Profile
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        <section className="mt-16 sm:mt-24 md:mt-40 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-20 items-center">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-6">Why professionals love GetCareerTruth</h2>
            <div className="space-y-6">
              {[
                { title: 'Help students avoid your mistakes', icon: <Heart className="w-5 h-5 text-accent" /> },
                { title: 'Build a meaningful side-income', icon: <DollarSign className="w-5 h-5 text-accent" /> },
                { title: 'Connect with talented youngsters', icon: <Users className="w-5 h-5 text-accent" /> },
                { title: 'Zero platform fee for early joiners', icon: <Zap className="w-5 h-5 text-accent" /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-surface border border-border rounded-lg flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-text-secondary font-medium">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
          <GlassCard className="p-10 rounded-3xl">
             <div className="absolute -top-6 -right-6 w-20 h-20 bg-accent/20 rounded-full blur-xl"></div>
             <blockquote className="relative z-10">
               <p className="text-xl italic text-text-primary mb-6">
                 "I wish this existed when I was in college. Sharing 15 minutes of my time saves a student months of confusion. The extra income is just a nice bonus!"
               </p>
               <footer className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">SM</div>
                 <div>
                   <cite className="not-italic font-bold text-text-primary text-lg">Siddharth M.</cite>
                   <p className="text-text-secondary text-sm">Product Manager @ Microsoft</p>
                 </div>
               </footer>
             </blockquote>
          </GlassCard>
        </section>
      </main>
    </div>
  );
}
