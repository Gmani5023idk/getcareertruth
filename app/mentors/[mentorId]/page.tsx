'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Star, Clock, MapPin, GraduationCap, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Mentor {
  id: string;
  name: string;
  photo?: string;
  college: string;
  domain: string;
  bio: string;
  sessionRate: number;
  availabilitySlots: { start: string; end: string }[];
  rating: number;
  reviewsCount: number;
}

export default function MentorProfilePage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = use(params);
  const router = useRouter();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMentor();
  }, [mentorId]);

  const fetchMentor = async () => {
    try {
      const res = await fetch(`/api/mentors/${mentorId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mentor not found');
      setMentor(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const platformFee = mentor ? Math.round(mentor.sessionRate * 0.15) : 0;
  const totalAmount = mentor ? mentor.sessionRate + platformFee : 0;

  const handleBooking = async () => {
    if (!mentor) return;
    if (!selectedSlot) {
      toast.error('Please select an availability slot');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: mentorId,
          scheduledAt: selectedSlot.start,
          topic: `Mentor Session with ${mentor.name}`,
          amountPaid: totalAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }
      toast.success('Booking request created! Proceeding to payment...');
      router.push(`/booking/${data.booking.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (!mentor) return <div className="p-20 text-center text-error font-bold">Mentor not found.</div>;

  return (
    <div className="min-h-screen bg-bg text-text-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 shadow-premium relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary to-accent opacity-20"></div>
            <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-4">
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white bg-surface shadow-xl">
                {mentor.photo ? (
                  <img src={mentor.photo} alt={mentor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-black text-4xl">
                    {mentor.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <h1 className="text-3xl font-black tracking-tight">{mentor.name}</h1>
                  <CheckCircle2 className="w-6 h-6 text-success fill-success/10" />
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-text-secondary font-medium">
                  <div className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    <span>{mentor.college}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-text-primary font-bold">{mentor.rating.toFixed(1)}</span>
                    <span className="text-xs">({mentor.reviewsCount} Reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                About Mentor
              </h2>
              <p className="text-text-secondary leading-relaxed text-lg whitespace-pre-wrap font-medium">
                {mentor.bio}
              </p>
              
              <div className="mt-8 flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-accent/5 rounded-xl border border-accent/20 text-xs font-black text-accent uppercase tracking-widest">
                  {mentor.domain}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Available Slots
            </h2>
            {mentor.availabilitySlots.length === 0 ? (
              <div className="text-center py-16 bg-surface-2 rounded-2xl border-2 border-dashed border-border">
                <p className="text-text-muted font-bold">No slots available right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {mentor.availabilitySlots.map((slot, i) => {
                  const isSelected = selectedSlot === slot;
                  const date = new Date(slot.start);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                        isSelected 
                        ? 'border-primary bg-primary/5 ring-4 ring-primary/10 scale-[0.98]' 
                        : 'border-border bg-surface hover:border-primary/50 hover:shadow-lg'
                      }`}
                    >
                      <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isSelected ? 'text-primary' : 'text-text-muted'}`}>
                        {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-lg font-black text-text-primary">
                        {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Fee & Booking */}
        <div className="space-y-6">
          <Card className="p-8 shadow-premium sticky top-8 border-primary/10 bg-gradient-to-br from-surface to-primary/[0.02] overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <h3 className="text-2xl font-black mb-10 text-text-primary">Booking Summary</h3>
            
            <div className="space-y-5 mb-10">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary font-bold text-sm uppercase tracking-wider">Session Fee</span>
                <span className="text-xl font-black text-text-primary">₹{mentor.sessionRate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary font-bold text-sm uppercase tracking-wider">Platform Fee</span>
                <span className="text-xl font-black text-text-primary">₹{platformFee}</span>
              </div>
              <div className="h-px bg-border my-6"></div>
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1">Total Payable</span>
                  <span className="text-4xl font-black text-primary leading-none">₹{totalAmount}</span>
                </div>
                <div className="text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded border border-success/20 uppercase">Secure Payment</div>
              </div>
            </div>

            <Button 
              className="w-full h-16 shadow-2xl shadow-primary/30 text-lg font-black" 
              onClick={handleBooking}
              disabled={!selectedSlot || submitting}
            >
              {submitting ? 'Creating Booking...' : (selectedSlot ? `Confirm & Pay ₹${totalAmount}` : 'Select a Slot')}
            </Button>
            
            <p className="mt-6 text-center text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Instant Confirmation • Zoom Meeting Linked
            </p>
          </Card>

          <Card className="p-6 bg-accent/[0.03] border-accent/10 border-dashed">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h4 className="font-bold text-accent text-sm">Online Session</h4>
                <p className="text-[11px] font-medium text-text-secondary mt-1">Live 1-on-1 video call via our secure Zoom integration.</p>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
