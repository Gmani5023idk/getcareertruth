'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, Home, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Image from 'next/image';

export default function ParentSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: '',
    // Step 2
    childStage: '',
    childCourse: '',
    concerns: [] as string[],
    openToConnect: true,
  });

  const concerns = [
    'Career options', 'Placement reality', 'Further education (PG/MBA)',
    'Salary expectations', 'Industry culture', 'All of the above',
  ];

  const toggleConcern = (concern: string) => {
    setFormData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern]
    }));
  };

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement signup API call
      console.log('Parent signup:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to dashboard
      router.push('/dashboard/parent');
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-2 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[38%] bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
        
        <div className="relative z-10 p-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-auto">
            <Logo />
          </div>

          {/* Tagline */}
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-display font-bold text-white italic mb-6">
              Make informed decisions for your child's future.
            </h2>
            
            <div className="space-y-4">
              {[
                'Talk to real employees at companies',
                'Understand salary realities',
                'Connect with other parents',
                'Verify career advisors',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <p className="text-white/75 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <p className="text-white/90 text-sm italic mb-3">
              "I had no idea what Data Science really meant until I spoke to a real data scientist."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-semibold">
                SM
              </div>
              <div>
                <p className="text-white text-xs font-medium">Sunita M.</p>
                <p className="text-white/60 text-xs">Parent, Hyderabad</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-all ${
                  s === step ? 'bg-primary w-8' : s < step ? 'bg-primary' : 'bg-surface-3'
                }`}
              />
            ))}
          </div>

          <Card className="p-6 sm:p-8 md:p-10">
            <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
              {step === 1 && 'Create your account'}
              {step === 2 && 'Tell us about your child'}
            </h1>
            <p className="text-sm text-text-secondary mb-6">
              {step === 1 && 'Start making informed career decisions.'}
              {step === 2 && 'Help us find the right guidance for your child.'}
            </p>

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <form className="space-y-4">
                <button
                  type="button"
                  className="w-full h-12 flex items-center justify-center gap-2 bg-surface border border-border shadow-sm rounded-xl hover:bg-surface-2 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-sm font-medium text-text-primary">Continue with Google</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-surface text-text-muted">or sign up with email</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-12 pl-10 pr-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                    placeholder="Your city"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full h-12 pl-10 pr-10 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </form>
            )}

            {/* Step 2: Child's Details */}
            {step === 2 && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Child's Current Stage
                  </label>
                  <select
                    value={formData.childStage}
                    onChange={(e) => setFormData({ ...formData, childStage: e.target.value })}
                    className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all bg-surface"
                    required
                  >
                    <option value="">Select stage</option>
                    <option value="school-9-10">School — Class 9-10</option>
                    <option value="school-11-12">School — Class 11-12</option>
                    <option value="college-1">College 1st Year</option>
                    <option value="college-2">College 2nd Year</option>
                    <option value="college-3">College 3rd Year</option>
                    <option value="college-final">College Final Year</option>
                    <option value="postgraduate">Postgraduate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Child's Stream or Course
                  </label>
                  <input
                    type="text"
                    value={formData.childCourse}
                    onChange={(e) => setFormData({ ...formData, childCourse: e.target.value })}
                    className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                    placeholder="e.g. Engineering CSE, Commerce, Science"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    Your Main Concerns
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {concerns.map((concern) => (
                      <button
                        key={concern}
                        type="button"
                        onClick={() => toggleConcern(concern)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          formData.concerns.includes(concern)
                            ? 'bg-primary text-white'
                            : 'bg-primary-bg text-primary border border-primary-border hover:bg-primary/10'
                        }`}
                      >
                        {concern}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-2 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Connect with other parents
                      </p>
                      <p className="text-xs text-text-muted">
                        Parents helping each other navigate the same uncertainty
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, openToConnect: !formData.openToConnect })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      formData.openToConnect ? 'bg-primary' : 'bg-surface-3'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        formData.openToConnect ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </form>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              
              {step < 2 ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  isLoading={loading}
                  className="flex-1"
                >
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            {/* Login Link */}
            <p className="text-center text-sm text-text-secondary mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
                Sign in
              </Link>
            </p>

            <div className="mt-8 pt-6 border-t border-border">
              <button
                onClick={() => router.push('/dashboard/parent')}
                className="w-full py-3 bg-surface-3 hover:bg-surface-2 text-text-primary text-sm font-bold rounded-xl border border-border flex items-center justify-center gap-2 transition-all group"
              >
                <span>🚀 Skip to Demo Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
