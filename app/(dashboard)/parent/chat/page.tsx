'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ChatPage from '@/components/chat/chat-page';
import { Loader2 } from 'lucide-react';

export default function ParentChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.id) {
      setUserId(session.user.id);
    }
  }, [session, status, router]);

  if (status === 'loading' || !userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-text-muted">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ChatPage userId={userId} type="parent" />
    </div>
  );
}
