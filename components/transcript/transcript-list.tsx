'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  ExternalLink
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import TranscriptViewer from './transcript-viewer';
import { format, parseISO } from 'date-fns';

interface Booking {
  id: string;
  topic: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
  employee?: {
    employeeProfile?: {
      fullName: string;
      company: string;
    }
  };
  student?: {
    studentProfile?: {
      fullName: string;
    }
  };
  parent?: {
    parentProfile?: {
      fullName: string;
    }
  };
}

interface TranscriptListProps {
  userId: string;
  role: 'EMPLOYEE' | 'STUDENT' | 'PARENT';
}

export default function TranscriptList({ userId, role }: TranscriptListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCompletedBookings();
  }, []);

  const fetchCompletedBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bookings?status=COMPLETED');
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => 
    booking.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (booking.employee?.employeeProfile?.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (booking.student?.studentProfile?.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedBookingId) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedBookingId(null)}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all transcripts</span>
        </button>
        <TranscriptViewer bookingId={selectedBookingId} userId={userId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          placeholder="Search by topic or mentor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-text-secondary">Loading transcripts...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="p-12 text-center glass">
          <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-bold mb-2">No transcripts found</h3>
          <p className="text-text-secondary max-w-xs mx-auto">
            {searchQuery ? "We couldn't find any transcripts matching your search." : "Transcripts will appear here after your sessions are completed."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((booking) => (
            <Card 
              key={booking.id} 
              className="p-4 glass hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => setSelectedBookingId(booking.id)}
            >
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                    {booking.topic}
                  </h3>
                  <p className="text-sm text-text-secondary mb-2">
                    {role === 'EMPLOYEE' 
                      ? `with ${booking.student?.studentProfile?.fullName || booking.parent?.parentProfile?.fullName || 'Student'}`
                      : `with ${booking.employee?.employeeProfile?.fullName || 'Mentor'}`
                    }
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> 
                      {format(parseISO(booking.scheduledAt), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 
                      {format(parseISO(booking.scheduledAt), 'hh:mm a')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="secondary" size="sm" className="gap-2">
                    View Transcript <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
