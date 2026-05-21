'use client';

import Link from 'next/link';
import { CheckCircle, Star } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 navbar-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[68px]">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2">
                <Image 
                  src="/logo.png" 
                  alt="GetCareerTruth Logo" 
                  width={32} 
                  height={32}
                  className="mix-blend-lighten"
                />
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-text-primary">GetCareer</span>
                  <span className="text-lg font-bold text-accent">Truth</span>
                </div>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/how-it-works" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                How It Works
              </Link>
              <Link href="/students" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                For Students
              </Link>
              <Link href="/for-employees" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                For Employees
              </Link>
              <Link href="/parents" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                For Parents
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Pricing
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Login
              </Link>
              <Link
                href="/get-started"
                className="px-5 py-2.5 text-sm font-medium text-text-primary btn-gradient rounded-xl"
              >
                Get Started Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-surface">
              <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center relative">
        {/* Subtle radial gradient blob */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/2 w-96 h-96 bg-primary/8 rounded-full blur-3xl opacity-8"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '48px' }}>
            {/* Left Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
            <div className="space-y-8">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-border rounded-full">
                <CheckCircle className="w-4 h-4 text-accent" />
                {/* REMOVED: placeholder stat */}<span className="text-xs font-medium font-semibold text-accent tracking-widest uppercase">Verified Employees</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-extrabold text-text-primary leading-[1.05] tracking-tight">
                Career advice you can <br />
                <span className="text-accent">actually trust.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-text-secondary max-w-md">
                15-minute real conversations with verified employees at your dream companies.
                No polished PR. No hidden agenda. Just unfiltered career truth.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/for-employees"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-medium text-white bg-primary rounded-xl hover:bg-primary-hover transition-all"
                >
                  Join as an Employee
                </Link>
                <Link
                  href="/employees"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-medium text-white bg-primary rounded-xl hover:bg-primary-hover transition-all"
                >
                  Find an Employee to Talk To
                </Link>
              </div>

              {/* Trust Strip */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-full border-2 border-border bg-gradient-to-br from-primary to-accent flex items-center justify-center text-text-primary font-semibold text-sm"
                    >
                      {i === 1 ? 'PM' : 'AR'}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-text-secondary">
                  {/* REMOVED: placeholder stat */}Students already making smarter career decisions
                </span>
              </div>
            </div>
            </div>

            {/* Right Content - Journey Arc Visualization */}
            <div className="journey-arc-wrapper" style={{ flexShrink: 0, width: '660px', height: '520px', maxWidth: '50vw', overflow: 'hidden', borderRadius: '24px', position: 'relative' }}>
              {/* Card wrapper — uses CSS variables so it works in both themes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '24px',
                  padding: '12px',
                  boxShadow: '0 24px 64px -12px rgba(0,0,0,0.18), 0 0 48px -16px rgba(0,180,216,0.10)',
                  width: '660px',
                  height: '520px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Fake browser chrome */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px 10px',
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '0.03em',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    15-min Real Call · Verified Employee · Real truth.
                  </span>
                </div>

                {/* iframe wrapper with fixed dimensions */}
                <div style={{ borderRadius: 16, overflow: 'hidden', width: '660px', height: '520px' }}>
                  <iframe
                    src="/journey-arc.html"
                    title="Journey Arc – Career Path Visualization"
                    loading="lazy"
                    style={{
                      display: 'block',
                      width: '660px',
                      height: '520px',
                      border: 'none',
                      borderRadius: 16,
                    }}
                  />
                </div>
              </motion.div>

              {/* Ambient glow behind the card */}
              <div
                className="absolute inset-0 -z-10 pointer-events-none"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <motion.div
                  style={{
                    width: 280,
                    height: 280,
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                    filter: 'blur(80px)',
                    opacity: 0.07,
                  }}
                  animate={{ scale: [1, 1.12, 1], opacity: [0.06, 0.12, 0.06] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-accent tracking-widest uppercase mb-3">THE PROBLEM</p>
            <h2 className="text-4xl md:text-[48px] font-bold text-text-primary mb-4">
              The career advice system is broken.
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Here's exactly what students and parents are up against.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { 
                title: 'Glamorised Advice', 
                desc: 'Influencers sell dreams, not daily reality.',
                icon: '🔥'
              },
              { 
                title: 'Outdated Placement Cells', 
                desc: 'Faculty advice frozen in 2015.',
                icon: '🕰️'
              },
              { 
                title: 'No Way to Verify Anyone', 
                desc: 'Zero proof the advisor works where they claim.',
                icon: '❓'
              },
              { 
                title: 'Wrong Skills Being Taught', 
                desc: 'College syllabus ≠ what companies actually want.',
                icon: '📚'
              },
              { 
                title: 'Fear of Wasting Years', 
                desc: '2–3 years chasing the wrong career path.',
                icon: '⏳'
              },
              { 
                title: 'Zero Real Access', 
                desc: 'No connection to people actually doing the job.',
                icon: '🚪'
              },
            ].map((item, i) => (
              <div key={i} className="card">
                <div className="gradient-icon">
                  <span className="text-xl">{item.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mt-4">{item.title}</h3>
                <p className="text-sm text-text-secondary mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-accent tracking-widest uppercase mb-3">HOW IT WORKS</p>
            <h2 className="text-4xl md:text-[48px] font-bold text-text-primary">
              Three steps to career clarity.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: 'Find Your Truth-Teller',
                desc: 'Browse verified/unverified employees. Filter by company, role, industry, college background.',
              },
              {
                step: 2,
                title: 'Book a 15-Minute Call',
                desc: 'Pick a slot. Pay a small fee. Employee confirms. Calendar invite sent.',
              },
              {
                step: 3,
                title: 'Get Unfiltered Truth',
                desc: 'Real conversation. No scripts, no PR polish. Honest, paid, purposeful.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 bg-primary/10 border border-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-semibold text-primary">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/how-it-works" className="text-accent underline hover:text-primary text-sm font-medium">
              See how employee verification works →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/7 to-transparent rounded-full blur-3xl"></div>
            <div className="relative">
              <h2 className="text-5xl font-extrabold text-text-primary mb-4">
                Stop guessing. Start knowing.
              </h2>
              <p className="text-lg text-text-secondary mb-8">
                Your career truth is one 15-minute conversation away.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/employees"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-medium text-text-primary border border-border rounded-xl hover:border-accent transition-all"
                >
                  Find an Employee to Talk To
                </Link>
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center px-7 py-3.5 text-base font-medium text-text-primary btn-gradient rounded-xl"
                >
                  Join as an Employee
                </Link>
              </div>
              <p className="text-sm text-text-secondary mt-4">
                Free to browse. Pay only when you book.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Image 
                  src="/logo.png" 
                  alt="GetCareerTruth Logo" 
                  width={40} 
                  height={40}
                  className="mix-blend-lighten"
                />
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-text-primary">GetCareer</span>
                  <span className="text-lg font-bold text-accent">Truth</span>
                </div>
              </div>
              <p className="text-text-secondary text-sm">Career truth. Verified. Human.</p>
            </div>

            <div>
              <h4 className="text-text-primary font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link href="/how-it-works" className="hover:text-accent">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-accent">Pricing</Link></li>
                <li><Link href="/employees" className="hover:text-accent">Browse Employees</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-text-primary font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link href="#" className="hover:text-accent">About</Link></li>
                <li><Link href="#" className="hover:text-accent">Blog</Link></li>
                <li><Link href="#" className="hover:text-accent">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 text-center">
            <p className="text-text-secondary text-sm">
              GetCareerTruth is not affiliated with any company. All employees independently verified.
            </p>
            <p className="text-text-secondary text-sm mt-2">
              India English only. Made for Indian students.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}