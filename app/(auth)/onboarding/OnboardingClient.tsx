'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GraduationCap, Briefcase, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function OnboardingClient() {
  const router = useRouter();
  const [role, setRole] = useState<'STUDENT' | 'EMPLOYEE' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompleteOnboarding = async () => {
    if (!role) return;
    setLoading(true);

    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) throw new Error('Failed to save role');

      router.push(role === 'STUDENT' ? '/dashboard/student' : '/dashboard/employee');
    } catch (error) {
      console.error('Onboarding error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-primary/5 rounded-full blur-[120px] -z-10"></div>
      
      <motion.div 
        initial="initial"
        animate="animate"
        variants={fadeUp}
        className="w-full max-w-md z-10"
      >
        <Card className="p-6 sm:p-8 md:p-10 shadow-premium border-primary/10 text-center">
          {/* Icon */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-xl"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1 
            variants={fadeUp}
            className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mb-3"
          >
            Welcome to GetCareerTruth!
          </motion.h1>
          <motion.p 
            variants={fadeUp}
            className="mb-8 text-text-secondary font-medium"
          >
            One last step — tell us who you are so we can tailor your experience.
          </motion.p>
          
          <motion.div variants={fadeUp} className="space-y-4 mb-8">
            <button
              onClick={() => setRole('STUDENT')}
              className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group ${
                role === 'STUDENT' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/40 hover:bg-surface-2'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                role === 'STUDENT' ? 'bg-primary text-white shadow-lg' : 'bg-surface-2 text-text-muted group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-black text-text-primary text-sm">I am a Student</p>
                <p className="text-xs text-text-secondary font-medium">Seeking real career insights</p>
              </div>
              {role === 'STUDENT' && (
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
              )}
            </button>
            <button
              onClick={() => setRole('EMPLOYEE')}
              className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 group ${
                role === 'EMPLOYEE' ? 'border-primary bg-primary/10 shadow-md' : 'border-border hover:border-primary/40 hover:bg-surface-2'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                role === 'EMPLOYEE' ? 'bg-primary text-white shadow-lg' : 'bg-surface-2 text-text-muted group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-black text-text-primary text-sm">I am an Employee / Professional</p>
                <p className="text-xs text-text-secondary font-medium">Sharing wisdom and earning</p>
              </div>
              {role === 'EMPLOYEE' && (
                <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
              )}
            </button>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Button
              onClick={handleCompleteOnboarding}
              disabled={!role || loading}
              className="w-full h-14 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Continue to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}
