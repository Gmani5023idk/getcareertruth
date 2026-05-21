'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Shield, Users, DollarSign, Clock, ArrowRight, Briefcase } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import Logo from '@/components/ui/Logo';

export default function ForEmployeesPage() {
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
          <h1 className="text-5xl font-black text-text-primary mb-6 tracking-tight">
            Share your truth. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Get paid for it.</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Join a community of verified professionals helping students navigate their careers with real, unfiltered advice.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
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
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }}
              className="p-8 bg-surface border border-border rounded-3xl hover:border-accent transition-all group"
            >
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-4">{feature.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          whileInView={{ opacity: 1, scale: 1 }} 
          className="mt-32 p-12 bg-gradient-to-br from-primary to-accent rounded-[40px] text-center text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to mentor the next generation?</h2>
          <p className="text-white/80 mb-10 max-w-xl mx-auto">
            It takes less than 5 minutes to set up your profile and start helping students find their career truth.
          </p>
          <Link 
            href="/signup/employee" 
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-primary font-bold rounded-2xl hover:scale-105 transition-all shadow-xl"
          >
            Create Your Mentor Profile
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        <section className="mt-40 grid md:grid-cols-2 gap-20 items-center">
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
          <div className="bg-surface border border-border p-10 rounded-3xl relative">
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
          </div>
        </section>
      </main>
    </div>
  );
}

import { Heart } from 'lucide-react';
