'use client';

import { useState, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Briefcase, 
  Home, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  User,
  Mail,
  Lock,
  Building,
  Target,
  IndianRupee,
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Logo from '@/components/ui/Logo';

// --- Schemas ---

const baseSchema = z.object({
  role: z.enum(['student', 'employee', 'parent']),
  fullName: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const studentSchema = baseSchema.extend({
  interests: z.array(z.string()).min(1, 'Select at least one interest'),
});

const employeeSchema = baseSchema.extend({
  company: z.string().min(2, 'Company name is required'),
  designation: z.string().min(2, 'Designation is required'),
  yearsOfExp: z.string().min(1, 'Years of experience is required'),
  topics: z.array(z.string()).min(1, 'Select at least one topic'),
  hourlyRate: z.string().min(1, 'Hourly rate is required'),
});

const parentSchema = baseSchema.extend({
  childName: z.string().min(2, "Child's name is required"),
  childGrade: z.string().min(1, "Child's grade/stage is required"),
});

type FormData = z.infer<typeof studentSchema> & z.infer<typeof employeeSchema> & z.infer<typeof parentSchema>;

// --- Components ---

export default function SignupFlow() {
  const [step, setStep] = useState(1);
  const [role, setSelectedRole] = useState<'student' | 'employee' | 'parent' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentSchema = useMemo(() => {
    if (role === 'student') return studentSchema;
    if (role === 'employee') return employeeSchema;
    if (role === 'parent') return parentSchema;
    return baseSchema;
  }, [role]);

  const methods = useForm<FormData>({
    resolver: zodResolver(currentSchema as any),
    mode: 'onChange',
    defaultValues: {
      interests: [],
      topics: [],
    }
  });

  const { register, handleSubmit, formState: { errors, isValid }, watch, setValue, trigger } = methods;

  const steps = useMemo(() => {
    const base = ['Role Select', 'Personal Info'];
    if (role === 'student') return [...base, 'Interests', 'Done'];
    if (role === 'employee') return [...base, 'Work Experience', 'Expertise', 'Pricing', 'Done'];
    if (role === 'parent') return [...base, 'Child Profile', 'Done'];
    return base;
  }, [role]);

  const totalSteps = steps.length;

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 2) fieldsToValidate = ['fullName', 'email', 'password'];
    if (step === 3 && role === 'employee') fieldsToValidate = ['company', 'designation', 'yearsOfExp'];
    
    if (fieldsToValidate.length > 0) {
      const isStepValid = await trigger(fieldsToValidate as any);
      if (!isStepValid) return;
    }

    setStep(s => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Final Data:', data);
    setStep(totalSteps);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-primary/5 rounded-full blur-[120px] -z-10"></div>
      
      <div className="w-full max-w-[480px] z-10 flex flex-col items-center">
        <Logo className="mb-10" />

        {/* Progress Bar */}
        <div className="w-full mb-10 px-4">
           <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Step {step} of {totalSteps}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{steps[step-1]}</span>
           </div>
           <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden border border-border shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                className="h-full bg-gradient-to-r from-primary to-accent"
              />
           </div>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="w-full">
            <AnimatePresence mode="wait">
              {/* Step 1: Role Selection */}
              {step === 1 && (
                <motion.div 
                  key="step1" 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                     <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">Who are you?</h2>
                     <p className="text-sm font-medium text-text-secondary">Tell us who you are so we can tailor your experience.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { id: 'student', icon: GraduationCap, label: 'I am a Student', desc: 'Seeking real career insights' },
                      { id: 'employee', icon: Briefcase, label: 'I am a Professional', desc: 'Sharing wisdom and earning' },
                      { id: 'parent', icon: Home, label: 'I am a Parent', desc: 'Planning my child\'s future' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setSelectedRole(r.id as any); setValue('role', r.id as any); nextStep(); }}
                        className="w-full h-24 p-6 flex items-center gap-6 bg-surface border-2 border-border rounded-3xl hover:border-primary/40 hover:bg-surface-2 transition-all group active:scale-[0.98]"
                      >
                         <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
                            <r.icon className="w-6 h-6" />
                         </div>
                         <div className="text-left flex-1">
                            <p className="font-black text-text-primary uppercase tracking-widest text-[10px] mb-1">{r.label}</p>
                            <p className="text-sm font-medium text-text-secondary leading-tight">{r.desc}</p>
                         </div>
                         <ChevronRight className="w-5 h-5 text-border group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Personal Info */}
              {step === 2 && (
                <motion.div 
                  key="step2" 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                     <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">Your Details</h2>
                     <p className="text-sm font-medium text-text-secondary">Create your GCT account</p>
                  </div>

                  <Card className="p-8 sm:p-10 space-y-6 shadow-premium border-primary/10">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Full Legal Name</label>
                        <div className="relative group">
                           <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                           <input {...register('fullName')} className="w-full h-14 pl-11 pr-4 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-sm" placeholder="e.g. Rahul Sharma" />
                        </div>
                        {errors.fullName && <p className="text-[10px] font-bold text-error px-1" role="alert">{errors.fullName.message}</p>}
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Work/University Email</label>
                        <div className="relative group">
                           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                           <input {...register('email')} type="email" className="w-full h-14 pl-11 pr-4 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-sm" placeholder="name@company.com" />
                        </div>
                        {errors.email && <p className="text-[10px] font-bold text-error px-1" role="alert">{errors.email.message}</p>}
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Password</label>
                        <div className="relative group">
                           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                           <input {...register('password')} type={showPassword ? 'text' : 'password'} className="w-full h-14 pl-11 pr-12 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-sm" placeholder="••••••••" />
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-primary transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                        </div>
                        {errors.password && <p className="text-[10px] font-bold text-error px-1" role="alert">{errors.password.message}</p>}
                     </div>
                  </Card>

                  <div className="flex gap-4">
                     <button type="button" onClick={prevStep} className="w-14 h-14 bg-surface border-2 border-border rounded-2xl flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/40 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                     <Button type="button" onClick={nextStep} className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Next</Button>
                  </div>
                </motion.div>
              )}

              {/* Role Specific Step 3: Interests (Student) / Experience (Professional) / Child Profile (Parent) */}
              {step === 3 && (
                <motion.div 
                  key="step3" 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                   {role === 'student' ? (
                     <div className="space-y-6">
                        <div className="text-center mb-8">
                           <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">Your Interests</h2>
                           <p className="text-sm font-medium text-text-secondary">Select topics you want to explore.</p>
                        </div>
                        <Card className="p-8 grid grid-cols-2 gap-3 shadow-premium border-primary/10">
                           {['Product', 'Software', 'Finance', 'Consulting', 'Design', 'Data'].map(t => (
                             <button
                               key={t}
                               type="button"
                               onClick={() => {
                                 const current = watch('interests') || [];
                                 if (current.includes(t)) setValue('interests', current.filter(x => x !== t));
                                 else setValue('interests', [...current, t]);
                               }}
                               className={`h-12 px-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${watch('interests')?.includes(t) ? 'bg-primary border-primary text-white shadow-lg' : 'bg-surface-2 border-border text-text-muted'}`}
                             >
                               {t}
                             </button>
                           ))}
                        </Card>
                        {errors.interests && <p className="text-center text-[10px] font-bold text-error">{errors.interests.message}</p>}
                        <div className="flex gap-4">
                           <button type="button" onClick={prevStep} className="w-14 h-14 bg-surface border-2 border-border rounded-2xl flex items-center justify-center text-text-muted"><ChevronLeft className="w-5 h-5" /></button>
                           <Button type="submit" isLoading={isLoading} className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20">Create Account</Button>
                        </div>
                     </div>
                   ) : role === 'employee' ? (
                     <div className="space-y-6">
                        <div className="text-center mb-8">
                           <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">Where You Work</h2>
                           <p className="text-sm font-medium text-text-secondary">Tell us about your current role.</p>
                        </div>
                        <Card className="p-8 sm:p-10 space-y-6 shadow-premium border-primary/10">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Current Company</label>
                              <div className="relative group">
                                 <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                                 <input {...register('company')} className="w-full h-14 pl-11 pr-4 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-sm" placeholder="e.g. Google India" />
                              </div>
                              {errors.company && <p className="text-[10px] font-bold text-error">{errors.company.message}</p>}
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Job Designation</label>
                              <div className="relative group">
                                 <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors" />
                                 <input {...register('designation')} className="w-full h-14 pl-11 pr-4 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-sm" placeholder="e.g. Senior PM" />
                              </div>
                              {errors.designation && <p className="text-[10px] font-bold text-error">{errors.designation.message}</p>}
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Years in Industry</label>
                              <select {...register('yearsOfExp')} className="w-full h-14 px-4 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-sm outline-none">
                                 <option value="">Select range...</option>
                                 <option value="1-3">1-3 Years</option>
                                 <option value="3-7">3-7 Years</option>
                                 <option value="7+">7+ Years</option>
                              </select>
                           </div>
                        </Card>
                        <div className="flex gap-4">
                           <button type="button" onClick={prevStep} className="w-14 h-14 bg-surface border-2 border-border rounded-2xl flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/40 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                           <Button type="button" onClick={nextStep} className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Next</Button>
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-6">
                        <div className="text-center mb-8">
                           <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">Child's Profile</h2>
                           <p className="text-sm font-medium text-text-secondary">Help us tailor insights for your child.</p>
                        </div>
                        <Card className="p-8 sm:p-10 space-y-6 shadow-premium border-primary/10">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Child's Full Name</label>
                              <input {...register('childName')} className="w-full h-14 px-4 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-sm" placeholder="Full name..." />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Education Stage</label>
                              <select {...register('childGrade')} className="w-full h-14 px-4 bg-surface-2 border-2 border-border rounded-2xl outline-none font-bold text-sm focus:border-primary transition-all">
                                 <option value="">Select stage...</option>
                                 <option value="High School">High School (9-12)</option>
                                 <option value="UG 1-2 Year">Undergrad (1st/2nd Year)</option>
                                 <option value="UG 3-4 Year">Undergrad (Final Year)</option>
                              </select>
                           </div>
                        </Card>
                        <div className="flex gap-4">
                           <button type="button" onClick={prevStep} className="w-14 h-14 bg-surface border-2 border-border rounded-2xl flex items-center justify-center text-text-muted"><ChevronLeft className="w-5 h-5" /></button>
                           <Button type="submit" isLoading={isLoading} className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20">Create Account</Button>
                        </div>
                     </div>
                   )}
                </motion.div>
              )}

              {/* Additional Steps for Professional (Expertise & Pricing) */}
              {role === 'employee' && step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                   <div className="text-center mb-8">
                      <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">Your Expertise</h2>
                      <p className="text-sm font-medium text-text-secondary">What topics can you discuss?</p>
                   </div>
                   <Card className="p-8 grid grid-cols-2 gap-3 shadow-premium border-primary/10">
                      {['Interview Prep', 'System Design', 'Management', 'Negotiation', 'Networking', 'Transition'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            const current = watch('topics') || [];
                            if (current.includes(t)) setValue('topics', current.filter(x => x !== t));
                            else setValue('topics', [...current, t]);
                          }}
                          className={`h-12 px-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${watch('topics')?.includes(t) ? 'bg-primary border-primary text-white shadow-lg' : 'bg-surface-2 border-border text-text-muted'}`}
                        >
                          {t}
                        </button>
                      ))}
                   </Card>
                   <div className="flex gap-4">
                      <button type="button" onClick={prevStep} className="w-14 h-14 bg-surface border-2 border-border rounded-2xl flex items-center justify-center text-text-muted"><ChevronLeft className="w-5 h-5" /></button>
                      <Button type="button" onClick={nextStep} className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Set Your Rate</Button>
                   </div>
                </motion.div>
              )}

              {role === 'employee' && step === 5 && (
                <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                   <div className="text-center mb-8">
                      <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-2">Your Rate</h2>
                      <p className="text-sm font-medium text-text-secondary">Set your market value (₹99 - ₹999+).</p>
                   </div>
                   <Card className="p-10 space-y-6 shadow-premium border-primary/10 text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary shadow-inner mb-6">
                         <IndianRupee className="w-10 h-10" />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Your Hourly Rate</label>
                         <input {...register('hourlyRate')} type="number" className="w-full h-16 text-center bg-surface-2 border-2 border-border rounded-3xl focus:outline-none focus:border-primary transition-all font-black text-3xl tracking-tighter" placeholder="1500" />
                      </div>
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Platform fee of 15% applies</p>
                   </Card>
                   <div className="flex gap-4">
                      <button type="button" onClick={prevStep} className="w-14 h-14 bg-surface border-2 border-border rounded-2xl flex items-center justify-center text-text-muted"><ChevronLeft className="w-5 h-5" /></button>
                      <Button type="submit" isLoading={isLoading} className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20">Create Account</Button>
                   </div>
                </motion.div>
              )}

              {/* Final Success Step */}
              {step === totalSteps && (
                <motion.div 
                  key="done" 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-10"
                >
                  <div className="w-32 h-32 bg-success/10 rounded-[48px] flex items-center justify-center mx-auto shadow-inner relative">
                     <CheckCircle className="w-16 h-16 text-success shadow-success/20" />
                     <motion.div 
                       animate={{ scale: [1, 1.5, 1], opacity: [0, 0.5, 0] }}
                       transition={{ repeat: Infinity, duration: 2 }}
                       className="absolute inset-0 bg-success/20 rounded-[48px]"
                     />
                  </div>
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight mb-4">Account Created!</h2>
                    <p className="text-text-secondary font-medium text-lg px-8">Your account is ready. Start exploring career truths!</p>
                  </div>
                  <Link href="/dashboard" className="block px-4">
                    <Button className="w-full h-16 text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/30">Go to Dashboard</Button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </FormProvider>

        {/* Footer */}
        {step < totalSteps && (
          <div className="mt-12 text-center space-y-6">
             <p className="text-sm font-medium text-text-secondary">
                Registered user? <Link href="/login" className="text-primary font-black uppercase tracking-widest text-[10px] ml-1 border-b-2 border-primary/20 pb-0.5 hover:text-accent">Sign In</Link>
             </p>

          </div>
        )}
      </div>
    </div>
  );
}
