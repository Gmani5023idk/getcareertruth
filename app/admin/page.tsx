'use client';

import React from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { Users, CreditCard, ShieldAlert, ChevronRight, Activity } from 'lucide-react';

export default function AdminControlCenter() {
  const stats = [
    { label: 'Mentor Apps', value: '12', icon: Users, color: 'text-blue-500', href: '/admin/mentor-applications' },
    { label: 'Pending Payouts', value: '₹42,500', icon: CreditCard, color: 'text-emerald-500', href: '/admin/payouts' },
    { label: 'Open Disputes', value: '3', icon: ShieldAlert, color: 'text-orange-500', href: '/admin/disputes' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 bg-bg min-h-screen">
      <div className="flex justify-between items-end border-b border-border pb-8">
        <div>
          <h1 className="text-5xl font-black text-text-primary tracking-tight">Admin OS</h1>
          <p className="text-text-secondary mt-2 text-lg font-medium">Global control center for GetCareerTruth mentors.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-2 rounded-xl border border-border">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-text-primary">System Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <Link key={i} href={stat.href}>
            <Card className="p-8 group hover:border-primary/30 transition-all cursor-pointer shadow-premium relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
               <div className="flex items-center justify-between mb-6">
                 <div className={`w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center ${stat.color} shadow-sm group-hover:scale-110 transition-transform`}>
                   <stat.icon className="w-7 h-7" />
                 </div>
                 <ChevronRight className="w-6 h-6 text-border group-hover:text-primary transition-all group-hover:translate-x-1" />
               </div>
               <div className="text-4xl font-black text-text-primary mb-1 tracking-tighter">{stat.value}</div>
               <div className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">{stat.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <Card className="p-8 border-dashed border-2 border-border flex flex-col justify-center items-center text-center group hover:bg-surface-2 transition-all">
          <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mb-6">
             <Activity className="w-8 h-8 text-text-muted group-hover:text-primary transition-colors" />
          </div>
          <h3 className="text-xl font-black text-text-primary mb-2">Platform Metrics</h3>
          <p className="text-text-secondary text-sm max-w-xs mx-auto mb-8">View detailed charts for mentor growth, student spend, and platform revenue.</p>
          <div className="px-6 py-2 rounded-full bg-surface-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Coming Soon</div>
        </Card>

        <Card className="p-8 border-dashed border-2 border-border flex flex-col justify-center items-center text-center group hover:bg-surface-2 transition-all">
          <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mb-6">
             <ShieldAlert className="w-8 h-8 text-text-muted group-hover:text-error transition-colors" />
          </div>
          <h3 className="text-xl font-black text-text-primary mb-2">Audit Logs</h3>
          <p className="text-text-secondary text-sm max-w-xs mx-auto mb-8">Full history of every transaction, payout attempt, and admin action.</p>
          <div className="px-6 py-2 rounded-full bg-surface-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Coming Soon</div>
        </Card>
      </div>
    </div>
  );
}
