'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [role, setRole] = useState<'STUDENT' | 'EMPLOYEE' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

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
    <div className="min-h-screen bg-surface-2 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <h1 className="text-2xl font-bold mb-6">Welcome to GetCareerTruth!</h1>
        <p className="mb-6 text-text-secondary">Please select your account type to continue.</p>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={() => setRole('STUDENT')}
            className={`w-full p-4 rounded-xl border-2 transition-all ${
              role === 'STUDENT' ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            I am a Student
          </button>
          <button
            onClick={() => setRole('EMPLOYEE')}
            className={`w-full p-4 rounded-xl border-2 transition-all ${
              role === 'EMPLOYEE' ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            I am an Employee / Professional
          </button>
        </div>

        <Button
          onClick={handleCompleteOnboarding}
          disabled={!role || loading}
          className="w-full"
        >
          {loading ? 'Saving...' : 'Continue to Dashboard'}
        </Button>
      </Card>
    </div>
  );
}
