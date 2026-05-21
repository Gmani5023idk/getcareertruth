'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  CheckCircle,
  Bell,
  GraduationCap,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

// Mock data
const mockUser = {
  name: 'Suresh Kumar',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh',
  city: 'Delhi',
  childCourse: 'Engineering',
};

export default function ParentDashboard() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Dashboard Nav */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button className="p-2 text-text-secondary hover:text-text-primary relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-success rounded-full border-2 border-bg"></span>
            </button>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-surface-2 transition-all border border-border/50"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-border">
                  <img src={mockUser.avatar} alt="User" className="w-full h-full object-cover" />
                </div>
                <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-2xl shadow-xl z-20 overflow-hidden"
                    >
                      <div className="p-4 border-b border-border bg-surface-2/30">
                        <p className="text-sm font-bold truncate">{mockUser.name}</p>
                        <p className="text-xs text-text-secondary truncate">Parent Dashboard</p>
                      </div>
                      <div className="p-2">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                          <User className="w-4 h-4" />
                          <span>My Profile</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </button>
                        <div className="h-px bg-border my-1 mx-2" />
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error hover:bg-error/5 rounded-xl transition-all">
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-display font-bold mb-2">
            Namaste, <span className="text-primary">{mockUser.name.split(' ')[0]}</span>
          </h1>
          <p className="text-text-secondary flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> Parent of {mockUser.childCourse} Student
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Upcoming', value: '1', icon: Calendar, color: 'text-primary' },
            { label: 'Past', value: '4', icon: Clock, color: 'text-accent' },
            { label: 'Circle', value: '12', icon: Users, color: 'text-purple-400' },
            { label: 'Insights', value: '3', icon: BookOpen, color: 'text-success' },
          ].map((stat, i) => (
            <Card key={i} className="p-6 glass">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary font-medium mb-1">{stat.label}</p>
                  <p className="text-2xl font-display font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-surface-2 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center py-20 glass rounded-3xl border-dashed border-2 border-border">
          <h2 className="text-xl font-display font-bold mb-2">No active sessions</h2>
          <p className="text-text-secondary mb-6">Find a mentor to help guide your child's career.</p>
          <Link href="/employees">
            <Button variant="primary">Browse Mentors</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
