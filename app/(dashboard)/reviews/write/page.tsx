'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star, Loader2, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import toast from 'react-hot-toast';

function WriteReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking');

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      toast.error('No booking specified');
      router.push('/student');
      return;
    }

    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (!res.ok) throw new Error('Failed to fetch booking details');
        const data = await res.json();
        
        if (data.status !== 'COMPLETED') {
          toast.error('Session is not completed yet');
          router.push(`/booking/${bookingId}`);
          return;
        }

        setBooking(data);
      } catch (error: any) {
        toast.error(error.message);
        router.push('/student');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          rating,
          text,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit review');
      }

      toast.success('Review submitted successfully!');
      setSubmitted(true);
      setTimeout(() => {
        router.push('/student');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message);
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-10 text-center glass">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
          <p className="text-text-secondary mb-6">
            Your review for {booking.employee.name} has been submitted.
          </p>
          <Button variant="primary" onClick={() => router.push('/student')}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <Card className="p-8 glass">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-primary/10">
              <img
                src={booking.employee.avatar || '/default-avatar.png'}
                alt={booking.employee.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Write a Review</h1>
              <p className="text-text-secondary">
                How was your session with <strong>{booking.employee.name}</strong>?
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-4">
                Rate your experience
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        (hoverRating || rating) >= star
                          ? 'fill-accent text-accent'
                          : 'text-text-muted fill-transparent'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-text-muted">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent!'}
              </p>
            </div>

            <div>
              <label htmlFor="review" className="block text-sm font-medium text-text-secondary mb-2">
                Tell us more (optional)
              </label>
              <textarea
                id="review"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share your thoughts on the session, advice provided, etc."
                className="w-full p-4 bg-surface-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
              <p className="mt-2 text-xs text-text-muted text-right">
                {text.length}/300 characters
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-4 shadow-accent gap-2"
              disabled={submitting || rating === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Submit Review
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function WriteReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <WriteReviewContent />
    </Suspense>
  );
}
