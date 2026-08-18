'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, GraduationCap, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { signupBasicSchema, studentEducationSchema, studentGoalsSchema } from '@/shared/schemas/auth.schema';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Logo from '@/components/ui/Logo';


export default function StudentSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [educationType, setEducationType] = useState<'SCHOOL' | 'COLLEGE'>('COLLEGE');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    // Step 1
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Step 2
    schoolName: '',
    className: '',
    stream: '',
    collegeName: '',
    degree: '',
    branch: '',
    currentYear: '',
    collegeEmail: '',
    city: '',
    // Step 3
    targetIndustries: [] as string[],
    targetCompanies: [] as string[],
    bio: '',
    howDidYouHear: '',
  });

  const industries = [
    'Software', 'Finance', 'Consulting', 'Marketing', 'Design',
    'Data & AI', 'Research', 'Law', 'Healthcare', 'Government', 'Media', 'Other'
  ];

  const toggleIndustry = (industry: string) => {
    setFormData(prev => ({
      ...prev,
      targetIndustries: prev.targetIndustries.includes(industry)
        ? prev.targetIndustries.filter(i => i !== industry)
        : [...prev.targetIndustries, industry]
    }));
  };

  const handleNext = () => {
    setFieldErrors({});
    let result;

    if (step === 1) {
      result = signupBasicSchema.safeParse({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
    } else if (step === 2) {
      const eduData = educationType === 'SCHOOL' ? {
        educationType,
        schoolName: formData.schoolName,
        className: formData.className,
        stream: formData.stream,
      } : {
        educationType,
        collegeName: formData.collegeName,
        degree: formData.degree,
        branch: formData.branch,
        currentYear: formData.currentYear,
        collegeEmail: formData.collegeEmail || undefined,
        city: formData.city,
      };
      result = studentEducationSchema.safeParse(eduData);
    }

    if (result && !result.success) {
      const newErrors: Record<string, string> = {};
      const issues = result.error?.issues ?? [];
      issues.forEach((err: z.ZodIssue) => {
        if (err.path && err.path[0]) {
          newErrors[err.path[0].toString()] = (err as unknown as Error).message;
        }
      });
      setFieldErrors(newErrors);
      return;
    }

    if (step < 3) setStep(step + 1);
  };

  const handleGoogleSignup = () => {
    signIn('google', { callbackUrl: '/dashboard/student' });
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement signup API call
      console.log('Student signup:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to dashboard
      router.push('/dashboard/student');
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
              Career truth starts here.
            </h2>
            
            <div className="space-y-4">
              {[
                'Verified employees at 500+ companies',
                '15-minute calls, paid, no fluff',
                'Your data is private and protected',
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
              "One 15-min call saved me 1.5 years of wrong preparation."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-semibold">
                AR
              </div>
              <div>
                <p className="text-white text-xs font-medium">Aditya R.</p>
                <p className="text-white/60 text-xs">3rd Year CSE, VIT</p>
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
            {[1, 2, 3].map((s) => (
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
              {step === 2 && 'Tell us about your education'}
              {step === 3 && 'What are your career goals?'}
            </h1>
            <p className="text-sm text-text-secondary mb-6">
              {step === 1 && 'Start your journey to career clarity.'}
              {step === 2 && 'Help us find the right employees for you.'}
              {step === 3 && 'We\'ll personalise your recommendations.'}
            </p>

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <form className="space-y-4">
                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignup}
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
                    className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
                    placeholder="Your full name"
                    required
                  />
                  {fieldErrors.fullName && <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>}
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
                      className="w-full h-12 pl-10 pr-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
                    placeholder="+91 98765 43210"
                  />
                  {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
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
                      className="w-full h-12 pl-10 pr-10 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
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
                  {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
                    placeholder="••••••••"
                    required
                  />
                  {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
                </div>
              </form>
            )}

            {/* Step 2: Education */}
            {step === 2 && (
              <form className="space-y-4">
                {/* Education Type Toggle */}
                <div className="flex gap-2 p-1 bg-surface-3 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEducationType('SCHOOL')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      educationType === 'SCHOOL'
                        ? 'bg-surface shadow-sm text-primary'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    School
                  </button>
                  <button
                    type="button"
                    onClick={() => setEducationType('COLLEGE')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      educationType === 'COLLEGE'
                        ? 'bg-surface shadow-sm text-primary'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    College / University
                  </button>
                </div>

                {educationType === 'SCHOOL' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        School Name
                      </label>
                      <input
                        type="text"
                        value={formData.schoolName}
                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                        className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
                        placeholder="Your school name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Class
                      </label>
                      <select
                        value={formData.className}
                        onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                        className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary appearance-none"
                        required
                      >
                        <option value="" className="bg-surface">Select class</option>
                        <option value="9" className="bg-surface">Class 9</option>
                        <option value="10" className="bg-surface">Class 10</option>
                        <option value="11" className="bg-surface">Class 11</option>
                        <option value="12" className="bg-surface">Class 12</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Stream
                      </label>
                      <select
                        value={formData.stream}
                        onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                        className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary appearance-none"
                        required
                      >
                        <option value="" className="bg-surface">Select stream</option>
                        <option value="PCM" className="bg-surface">Science (PCM)</option>
                        <option value="PCB" className="bg-surface">Science (PCB)</option>
                        <option value="Commerce" className="bg-surface">Commerce</option>
                        <option value="Arts" className="bg-surface">Arts</option>
                        <option value="Other" className="bg-surface">Other</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        College Name
                      </label>
                      <input
                        type="text"
                        value={formData.collegeName}
                        onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                        className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
                        placeholder="Your college name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Degree
                      </label>
                      <select
                        value={formData.degree}
                        onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                        className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary appearance-none"
                        required
                      >
                        <option value="" className="bg-surface">Select degree</option>
                        <option value="B.Tech" className="bg-surface">B.Tech</option>
                        <option value="BCA" className="bg-surface">BCA</option>
                        <option value="B.Sc" className="bg-surface">B.Sc</option>
                        <option value="B.Com" className="bg-surface">B.Com</option>
                        <option value="BBA" className="bg-surface">BBA</option>
                        <option value="BA" className="bg-surface">BA</option>
                        <option value="B.Arch" className="bg-surface">B.Arch</option>
                        <option value="B.Pharm" className="bg-surface">B.Pharm</option>
                        <option value="Other" className="bg-surface">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Branch / Specialisation
                      </label>
                      <input
                        type="text"
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
                        placeholder="e.g. CSE, ECE, Finance"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Current Year
                      </label>
                      <select
                        value={formData.currentYear}
                        onChange={(e) => setFormData({ ...formData, currentYear: e.target.value })}
                        className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary appearance-none"
                        required
                      >
                        <option value="" className="bg-surface">Select year</option>
                        <option value="1" className="bg-surface">1st Year</option>
                        <option value="2" className="bg-surface">2nd Year</option>
                        <option value="3" className="bg-surface">3rd Year</option>
                        <option value="4" className="bg-surface">4th Year</option>
                        <option value="5" className="bg-surface">Final Semester</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        College Email (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                        <input
                          type="email"
                          value={formData.collegeEmail}
                          onChange={(e) => setFormData({ ...formData, collegeEmail: e.target.value })}
                          className="w-full h-12 pl-10 pr-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
                          placeholder="name@college.edu"
                        />
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Get a College Verified badge on your profile
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
                    placeholder="Your city"
                    required
                  />
                </div>
              </form>
            )}

            {/* Step 3: Career Goals */}
            {step === 3 && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    Target Industries
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {industries.map((industry) => (
                      <button
                        key={industry}
                        type="button"
                        onClick={() => toggleIndustry(industry)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          formData.targetIndustries.includes(industry)
                            ? 'bg-primary text-white'
                            : 'bg-primary-bg text-primary border border-primary-border hover:bg-primary/10'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    What confuses you most about your career?
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full h-28 px-4 py-3 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all resize-none text-text-primary placeholder:text-text-muted"
                    placeholder="e.g. I'm confused between software and data science..."
                    maxLength={150}
                  />
                  <p className="text-xs text-text-muted mt-1 text-right">
                    {formData.bio.length}/150
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    How did you hear about us?
                  </label>
                  <select
                    value={formData.howDidYouHear}
                    onChange={(e) => setFormData({ ...formData, howDidYouHear: e.target.value })}
                    className="w-full h-12 px-4 bg-surface border border-border rounded-xl focus:ring-3 focus:ring-primary/15 focus:border-primary outline-none transition-all text-text-primary appearance-none"
                  >
                    <option value="" className="bg-surface">Select an option</option>
                    <option value="social_media" className="bg-surface">Social Media</option>
                    <option value="friend" className="bg-surface">Friend / Colleague</option>
                    <option value="college" className="bg-surface">College / University</option>
                    <option value="google" className="bg-surface">Google Search</option>
                    <option value="other" className="bg-surface">Other</option>
                  </select>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary bg-surface"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-text-secondary">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
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
              
              {step < 3 ? (
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
                onClick={() => router.push('/dashboard/student')}
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
