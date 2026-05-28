'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Clock,
  Star,
  MapPin,
  Calendar as CalendarIcon,
  MessageSquare,
  CheckCircle,
  Loader2,
  ChevronLeft,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: string;
  durationMins: number;
}

interface Employee {
  fullName: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  yearsExp?: number;
  bio?: string;
  topics: string[];
  pricePerCall: number;
  rating?: number;
  totalReviews?: number;
  user: { profilePhoto?: string | null };
}

export default function BookEmployeePage() {
  const params = useParams();
  const employeeId = params.employeeId as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const [empRes, slotsRes] = await Promise.all([
          fetch(`/api/employees/${employeeId}`),
          fetch(`/api/employees/${employeeId}/available-slots?start=${new Date().toISOString().split('T')[0]}`),
        ]);

        if (!empRes.ok) throw new Error('Failed to fetch employee');
        const empData = await empRes.json();
        setEmployee(empData.employee);

        if (slotsRes.ok) {
          const slotsData = await slotsRes.json();
          setSlots(slotsData.slots || []);
        }
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [employeeId]);

  // Group slots by date
  const groupedSlots = slots.reduce((acc, slot) => {
    const date = slot.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const uniqueDates = Object.keys(groupedSlots).sort();

  const handleSubmit = async () => {
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }
    if (!topic.trim()) {
      toast.error('Please enter a topic for the session');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          scheduledAt: selectedSlot.startDateTime,
          topic: topic.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }
      toast.success('Booking request created! You will be notified once the mentor approves.');
      // Redirect to booking confirmation page after short delay
      setTimeout(() => {
        window.location.href = `/booking/${data.booking.id}`;
      }, 1500);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <p className="text-error text-lg">Employee not found</p>
        <Link href="/">
          <Button variant="primary">Go Home</Button>
        </Link>
      </div>
    );
  }

  // Filter by selected date
  const displaySlots = selectedDate === 'all' ? slots : groupedSlots[selectedDate] || [];

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Header */}
      <div className="border-b border-border bg-surface/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-surface-2 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight">
              GetCareer<span className="text-primary">Truth</span>
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Employee Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 glass border-primary/10">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-primary/10 mb-4">
                  <img
                    src={employee.user.profilePhoto || '/default-avatar.png'}
                    alt={employee.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1 className="text-2xl font-display font-bold">{employee.fullName}</h1>
                <p className="text-sm text-text-secondary">
                  {employee.jobTitle} @ {employee.company}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {employee.rating && (
                    <span className="flex items-center text-xs font-bold text-accent">
                      <Star className="w-4 h-4 fill-accent mr-1" /> {employee.rating} ({employee.totalReviews} reviews)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Experience</p>
                    <p className="text-text-secondary">{employee.yearsExp} years in {employee.industry}</p>
                  </div>
                </div>
                {employee.bio && (
                  <div className="pt-4 border-t border-border">
                    <p className="font-bold mb-2">About</p>
                    <p className="text-text-secondary leading-relaxed">{employee.bio}</p>
                  </div>
                )}
                <div className="pt-4 border-t border-border">
                  <p className="font-bold mb-2">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {employee.topics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-surface-2 text-xs font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary">Price per call</p>
                    <p className="text-xl font-bold text-primary">₹ {employee.pricePerCall}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Duration</p>
                    <p className="font-medium">30 minutes</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 glass border-primary/10">
              <h2 className="text-2xl font-display font-bold mb-6">Select a time slot</h2>

              {/* Date filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Filter by date</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full md:w-1/2 bg-surface border border-border rounded-lg p-2.5 text-sm"
                >
                  <option value="all">All Dates</option>
                  {uniqueDates.map((date) => (
                    <option key={date} value={date}>
                      {format(parseISO(date), 'EEE, MMM d, yyyy')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Slots grid */}
              {displaySlots.length === 0 ? (
                <p className="text-text-secondary text-center py-8">No available slots found for the selected date range.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
                  {displaySlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedSlot?.id === slot.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-display font-bold">
                        {format(parseISO(slot.date), 'MMM d')}
                      </div>
                      <div className="text-lg">
                        {slot.startTime} – {slot.endTime}
                      </div>
                      <div className="text-xs opacity-75">Slot</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Form */}
              {selectedSlot && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-6 border-t border-border"
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">Session Topic</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Career guidance for software engineering"
                      className="w-full bg-surface border border-border rounded-lg p-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Additional Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any specific questions or background info..."
                      rows={3}
                      className="w-full bg-surface border border-border rounded-lg p-3 text-sm"
                    />
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="font-bold text-primary">
                          {format(parseISO(selectedSlot.date), 'EEEE, MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {selectedSlot.startTime} – {selectedSlot.endTime} (30 min)
                        </p>
                        <p className="text-sm mt-1">
                          Amount to be paid after approval: <span className="font-bold text-primary">₹ {employee.pricePerCall}</span>
                        </p>
                      </div>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        size="lg"
                        className="w-full sm:w-auto min-w-[160px]"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Submitting...
                          </>
                        ) : (
                          'Book Now'
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </Card>

            {/* Info Card */}
            <Card className="p-6 glass border-primary/10">
              <h3 className="font-display font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> What happens next?
              </h3>
              <ol className="space-y-4">
                {[
                  'Your booking request is sent to the mentor for approval.',
                  'If approved, you will receive an email with a payment link.',
                  'Once payment is confirmed, a Zoom meeting link and chat room will be created.',
                  'Join the meeting at the scheduled time and discuss!',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm text-text-secondary pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
