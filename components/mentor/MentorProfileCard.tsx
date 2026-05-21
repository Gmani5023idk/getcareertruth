'use client';

import React from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { Star } from 'lucide-react';

interface MentorCardProps {
  id: string;
  name: string;
  photo?: string;
  college: string;
  domain: string;
  sessionRate: number;
  rating: number;
  reviewsCount: number;
}

export default function MentorProfileCard({
  id,
  name,
  photo,
  college,
  domain,
  sessionRate,
  rating,
  reviewsCount,
}: MentorCardProps) {
  return (
    <Link href={`/mentors/${id}`}>
      <Card className="p-5 hover:shadow-premium transition-all group border-2 border-transparent hover:border-primary/20 cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-2 flex-shrink-0 border border-border">
            {photo ? (
              <img src={photo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xl uppercase">
                {name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-text-primary group-hover:text-primary transition-colors">{name}</h3>
            <p className="text-sm text-text-secondary line-clamp-1">{college}</p>
            <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-accent/10 text-accent uppercase tracking-tighter">
              {domain}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-black text-text-primary">{rating.toFixed(1)}</span>
            <span className="text-xs text-text-muted">({reviewsCount})</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Session Fee</div>
            <div className="text-lg font-black text-primary">₹{sessionRate}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
