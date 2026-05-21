'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { CheckCircle, Mail, Lock, Eye, EyeOff, Briefcase, Building2, Clock, ArrowRight, ArrowLeft, Calendar, IndianRupee } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';


export default function EmployeeSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BANK'>('UPI');

  // Form state
  const [formData, setFormData] = useState({
    // Step 1
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Step 2
    company: '',
    jobTitle: '',
    industry: '',
    yearsExp: '',
    workCity: '',
    // Step 3
    linkedInConnected: false,
    companyEmail: '',
    // Step 4
    pricePerCall: '299',
    availabilitySlots: {
      mon: [] as string[],
      tue: [] as string[],
      wed: [] as string[],
      thu: [] as string[],
      fri: [] as string[],
      sat: [] as string[],
      sun: [] as string[],
    },
    upiId: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bio: '',
    topics: [] as string[],
  });

  const topics = [
    'Day in my life', 'Placement prep', 'Career switch',
    'MBA vs job', 'Salary reality', 'Interview prep',
    'Company culture', 'Work-life balance', 'Growth path',
  ];

  const toggleTopic = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic]
    }));
  };

  const handleNext = () => {
    // Validate current step before advancing
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.password || formData.password !== formData.confirmPassword) {
        toast.error('Please fill in all fields correctly (ensure passwords match)');
        return;
      }
    } else if (step === 2) {
      if (!formData.company || !formData.jobTitle || !formData.industry || !formData.yearsExp) {
        toast.error('Please provide your professional background');
        return;
      }
    } else if (step === 3) {
      // Step 3 is optional, so no strict validation needed
    }
    
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate final step
    if (!formData.pricePerCall) {
      toast.error('Please set your price per call');
      return;
    }
    
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to dashboard
      router.push('/dashboard/employee');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Signup failed. Please try again.');
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
              Share your truth. Earn for your time.
            </h2>
            
            <div className="space-y-4">
              {[
                'Set your own price',
                'Flexible availability',
                'Help students avoid wrong paths',
                'No mandatory verification to start',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <p className="text-white/75 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
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
              {step === 2 && 'Tell us about your work'}
              {step === 3 && 'Verification (Optional)'}
              {step === 4 && 'Set your price & availability'}
            </h1>
            <p className="text-sm text-text-secondary mb-6">
              {step === 1 && 'Start sharing your career truth.'}
              {step === 2 && 'Help students find the right mentor.'}
              {step === 3 && 'Earn your Verified badge for more bookings.'}
              {step === 4 && 'You\'re in control of your time and earnings.'}
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

            {/* Step 2: Professional Details */}
            {step === 2 && (
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Current Company
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full h-12 pl-10 pr-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                      placeholder="e.g. Google, Microsoft, Flipkart"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Job Title
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      className="w-full h-12 pl-10 pr-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                      placeholder="e.g. Software Engineer, Product Manager"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                    placeholder="e.g. Software, Finance, Consulting"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    value={formData.yearsExp}
                    onChange={(e) => setFormData({ ...formData, yearsExp: e.target.value })}
                    className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                    placeholder="e.g. 5"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Work City
                  </label>
                  <input
                    type="text"
                    value={formData.workCity}
                    onChange={(e) => setFormData({ ...formData, workCity: e.target.value })}
                    className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                    placeholder="e.g. Bengaluru, Mumbai"
                  />
                </div>

              </form>
            )}

            {/* Step 3: Verification (Optional) */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-accent-bg border border-accent-border rounded-xl p-4">
                  <p className="text-sm text-text-primary font-medium mb-2">
                    🔒 Verification helps you earn more bookings.
                  </p>
                  <p className="text-xs text-text-secondary">
                    Employees without verification can still take calls — you just won't have the Verified badge yet.
                  </p>
                </div>

                {/* LinkedIn */}
                <div className="border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="font-medium text-text-primary">LinkedIn Connection</span>
                    </div>
                    {formData.linkedInConnected ? (
                      <span className="text-xs bg-verified-bg text-verified rounded-full px-2 py-0.5">✓ Connected</span>
                    ) : (
                      <button
                        type="button"
                        className="text-xs bg-[#0077B5] text-white rounded-lg px-3 py-1.5 hover:bg-[#006097] transition-colors"
                      >
                        Connect LinkedIn
                      </button>
                    )}
                  </div>
                  {formData.linkedInConnected && (
                    <p className="text-xs text-text-muted">
                      Connected as {formData.fullName} · {formData.jobTitle} at {formData.company}
                    </p>
                  )}
                </div>

                {/* Company Email */}
                <div className="border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-5 h-5 text-primary" />
                    <span className="font-medium text-text-primary">Company Email OTP</span>
                  </div>
                  <input
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                    className="w-full h-10 px-3 border border-border rounded-lg focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-sm"
                    placeholder="name@company.com"
                  />
                  <button
                    type="button"
                    className="mt-2 w-full text-xs bg-primary text-white rounded-lg py-2 hover:bg-primary-hover transition-colors"
                  >
                    Send OTP
                  </button>
                </div>


                <div className="text-center">
                  <Link
                    href="#"
                    className="text-sm text-text-muted hover:text-text-primary"
                  >
                    Skip for now →
                  </Link>
                </div>
              </div>
            )}

            {/* Step 4: Pricing & Availability */}
            {step === 4 && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Your price per 15-minute call (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="number"
                      value={formData.pricePerCall}
                      onChange={(e) => setFormData({ ...formData, pricePerCall: e.target.value })}
                      className="w-full h-12 pl-10 pr-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                      placeholder="299"
                      min="0"
                      required
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    You set your own price. Most employees charge ₹199–₹499.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    What topics are you open to discuss?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          formData.topics.includes(topic)
                            ? 'bg-primary text-white'
                            : 'bg-primary-bg text-primary border border-primary-border hover:bg-primary/10'
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Bio (500 chars max)
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full h-24 px-4 py-3 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all resize-none text-sm"
                    placeholder="What topics are you open to discuss?"
                    maxLength={500}
                  />
                  <p className="text-xs text-text-muted mt-1 text-right">
                    {formData.bio.length}/500
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    Payout Method
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('UPI')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        payoutMethod === 'UPI'
                          ? 'bg-surface shadow-sm border-2 border-primary text-primary'
                          : 'bg-surface-3 border border-border text-text-muted'
                      }`}
                    >
                      UPI ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('BANK')}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        payoutMethod === 'BANK'
                          ? 'bg-surface shadow-sm border-2 border-primary text-primary'
                          : 'bg-surface-3 border border-border text-text-muted'
                      }`}
                    >
                      Bank Account
                    </button>
                  </div>
                </div>

                {payoutMethod === 'UPI' ? (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                      placeholder="yourname@upi"
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                        placeholder="Your account number"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={formData.bankIfsc}
                        onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value })}
                        className="w-full h-12 px-4 border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all"
                        placeholder="SBIN0001234"
                        required
                      />
                    </div>
                  </>
                )}

                <p className="text-xs text-text-muted">
                  Payouts within 7 working days of call completion.
                </p>
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
              
              {step < 4 ? (
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
                onClick={() => router.push('/dashboard/employee')}
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
