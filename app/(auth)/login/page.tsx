'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, CheckCircle, ChevronLeft, AlertCircle } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { signIn } from 'next-auth/react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/dashboard/student' }); 
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid credentials. Please try again.');
        return;
      }

      // Role based routing
      if (data.user.role === 'STUDENT') router.push('/dashboard/student');
      else if (data.user.role === 'EMPLOYEE') router.push('/dashboard/employee');
      else if (data.user.role === 'PARENT') router.push('/dashboard/parent');
      else router.push('/');
    } catch (err) {
      setError('Connection error. Please check your internet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-full bg-primary/5 rounded-full blur-[120px] -z-10"></div>
      
      <div className="w-full max-w-[420px] z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
           <Logo className="mb-8" />
           <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight mb-2">
             {showForgotPassword ? 'Forgot Password?' : 'Welcome Back'}
           </h1>
           <p className="text-text-secondary font-medium px-4">
             {showForgotPassword 
               ? "Enter your email and we'll send a magic link." 
               : "Sign in to continue your career journey."}
           </p>
        </div>

        <Card className="p-8 sm:p-10 shadow-premium border-primary/10">
           {!showForgotPassword ? (
             <div className="space-y-8">
                {/* Social Login */}
                <button 
                  onClick={handleGoogleLogin}
                  className="w-full h-14 flex items-center justify-center gap-4 bg-surface border-2 border-border rounded-2xl hover:bg-surface-2 hover:border-primary/30 transition-all group group-active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-sm font-black uppercase tracking-widest text-text-primary">Sign in with Google</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]"><span className="px-4 bg-surface text-text-muted">Or sign in with email</span></div>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                   {error && (
                     <div className="p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 animate-shake">
                        <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                        <p className="text-xs font-bold text-error leading-tight">{error}</p>
                     </div>
                   )}

                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Email Address</label>
                      <div className="relative group">
                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
                         <input
                           type="email"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           className="w-full h-14 pl-12 pr-4 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-base"
                           placeholder="name@university.edu"
                           required
                         />
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                         <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Password</label>
                         <button 
                           type="button" 
                           onClick={() => setShowForgotPassword(true)}
                           className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-accent transition-colors"
                         >
                           Forgot password?
                         </button>
                      </div>
                      <div className="relative group">
                         <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
                         <input
                           type={showPassword ? 'text' : 'password'}
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           className="w-full h-14 pl-12 pr-12 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-base"
                           placeholder="••••••••"
                           required
                         />
                         <button
                           type="button"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
                         >
                           {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                         </button>
                      </div>
                   </div>

                   <Button 
                     type="submit" 
                     className="w-full h-16 shadow-2xl shadow-primary/20 text-base font-black uppercase tracking-widest"
                     isLoading={isLoading}
                   >
                     Sign In
                   </Button>
                </form>
             </div>
           ) : (
             /* Recovery Flow */
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                {!resetSent ? (
                  <form onSubmit={(e) => { e.preventDefault(); setResetSent(true); }} className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Account Email</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full h-14 px-4 bg-surface-2 border-2 border-border rounded-2xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-base"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-16 font-black uppercase tracking-widest">
                      Send Magic Link
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-20 h-20 bg-success/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                       <CheckCircle className="w-10 h-10 text-success" />
                    </div>
                    <h3 className="text-xl font-black mb-2">Check Your Inbox</h3>
                    <p className="text-text-secondary text-sm font-medium leading-relaxed">
                      We've sent recovery instructions to <br/><span className="text-text-primary font-bold">{resetEmail}</span>
                    </p>
                  </div>
                )}
                
                <button 
                  onClick={() => { setShowForgotPassword(false); setResetSent(false); }}
                  className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-primary transition-all"
                >
                   <ChevronLeft className="w-3 h-3" /> Return to Login
                </button>
             </div>
           )}
        </Card>

        {/* Footer Info */}
        {!showForgotPassword && (
          <div className="mt-10 text-center space-y-6">
             <p className="text-sm font-medium text-text-secondary">
               New to GCT?{' '}
               <Link href="/get-started" className="text-primary hover:text-accent font-black uppercase tracking-widest text-xs ml-1 border-b-2 border-primary/20 pb-0.5">
                 Create Account
               </Link>
             </p>

          </div>
        )}
      </div>
    </div>
  );
}
