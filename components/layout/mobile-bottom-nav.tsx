'use client';

import { Home, Users, Calendar, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface MobileBottomNavProps {
  role?: 'student' | 'employee' | 'parent';
}

export default function MobileBottomNav({ role = 'student' }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      href: '/',
    },
    {
      label: 'Employees',
      icon: Users,
      href: '/employees',
    },
    {
      label: 'Bookings',
      icon: Calendar,
      href: role === 'student' ? '/student/bookings' : role === 'employee' ? '/employee/bookings' : '/parent/bookings',
    },
    {
      label: 'Chat',
      icon: MessageSquare,
      href: role === 'student' ? '/student/chat' : role === 'employee' ? '/employee/chat' : '/parent/chat',
    },
    {
      label: 'Profile',
      icon: User,
      href: role === 'student' ? '/student/profile' : role === 'employee' ? '/employee/profile' : '/parent/profile',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border md:hidden z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                isActive ? 'text-primary' : 'text-text-muted'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
