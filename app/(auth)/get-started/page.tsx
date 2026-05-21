'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Briefcase, Home, CheckCircle, ChevronRight } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function GetStartedPage() {
  const [selectedRole, setSelectedRole] = useState<'student' | 'employee' | 'parent' | null>(null);

  const roles = [
    {
      id: 'student' as const,
      icon: GraduationCap,
      title: "I'm a Student",
      description: 'Undergraduates or high schoolers seeking authentic career paths.',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      id: 'employee' as const,
      icon: Briefcase,
      title: "I'm a Professional",
      description: 'Verified employees sharing wisdom and earning from sessions.',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'parent' as const,
      icon: Home,
      title: "I'm a Parent",
      description: 'Securing the best industry-led outcomes for your child.',
      color: 'from-orange-500 to-rose-500',
    },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      
      <div className="w-full max-w-4xl z-10 flex flex-col items-center">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
           <Logo className="mb-10" />
           <h1 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight mb-4 leading-tight">
             Start Your <span className="text-primary italic underline decoration-primary/20 decoration-8 underline-offset-8">Career Journey.</span>
           </h1>
           <p className="text-text-secondary font-medium text-lg max-w-md px-4">
             Select your role to start exploring career truths you won't find anywhere else.
           </p>
        </div>

        {/* Role Cards - Mobile Vertical Stack, Desktop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`
                  relative flex flex-col items-center sm:items-start text-center sm:text-left p-8 sm:p-10 rounded-3xl border-2 transition-all duration-500 w-full group
                  ${isSelected 
                    ? 'bg-surface border-primary shadow-2xl scale-[1.02]' 
                    : 'bg-surface/50 border-border hover:border-primary/40 hover:bg-surface shadow-sm'}
                `}
              >
                {isSelected && (
                  <div className="absolute top-6 right-6">
                    <CheckCircle className="w-8 h-8 text-primary animate-in zoom-in-75 duration-300" />
                  </div>
                )}

                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-text-primary mb-3 tracking-tight">{role.title}</h3>
                <p className="text-sm sm:text-base text-text-secondary font-medium leading-relaxed">{role.description}</p>
                
                <div className="mt-8 flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                   Select Role <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="mt-16 w-full max-w-md px-4">
          <Link
            href={selectedRole ? `/signup/${selectedRole}` : '#'}
            onClick={(e) => { if (!selectedRole) e.preventDefault(); }}
            className="w-full"
          >
            <Button
              className={`w-full h-16 text-lg font-black uppercase tracking-widest shadow-2xl transition-all duration-300 ${
                selectedRole ? 'shadow-primary/30' : 'opacity-40 grayscale cursor-not-allowed border-none bg-surface-3'
              }`}
              disabled={!selectedRole}
            >
              Create Your Account <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          
          <p className="mt-8 text-center text-sm font-medium text-text-muted">
            Already have an account? <Link href="/login" className="text-primary font-black uppercase tracking-widest text-[10px] ml-1 border-b-2 border-primary/20 pb-0.5 hover:text-accent">Sign in</Link>
          </p>
        </div>


      </div>
    </div>
  );
}
