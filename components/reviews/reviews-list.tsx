'use client';

import { useState, useEffect } from 'react';
import { Star, User } from 'lucide-react';
import Button from '@/components/ui/Button';

// ============================================================================
// Types
// ============================================================================

interface Review {
  id: string;
  rating: number;
  text: string;
  reviewerName: string;
  createdAt: string | Date;
  isPublic?: boolean;
}

interface ReviewsListProps {
  employeeId: string;
  /** If provided, renders admin actions (approve/reject/delete) */
  isAdminView?: boolean;
  onApprove?: (reviewId: string) => void;
  onReject?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
}

// ============================================================================
// StarRating
// ============================================================================

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        />
      ))}
    </div>
  );
}

// ============================================================================
// ReviewCard
// ============================================================================

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ReviewCard({
  review,
  isAdmin,
  onApprove,
  onReject,
  onDelete,
}: {
  review: Review;
  isAdmin: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{review.reviewerName}</p>
            <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>

      {/* Review text */}
      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
        {review.text}
      </p>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          {!review.isPublic && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onApprove?.(review.id)}
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReject?.(review.id)}
              >
                Reject
              </Button>
            </>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-red-600">Confirm delete?</span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDelete?.(review.id);
                  setConfirmDelete(false);
                }}
              >
                Yes, delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-red-500 ml-auto"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ReviewsList (main exported component)
// ============================================================================

/**
 * ReviewsList — fetches and displays reviews for an employee.
 *
 * Usage (public):
 *   <ReviewsList employeeId="emp_123" />
 *
 * Usage (admin):
 *   <ReviewsList employeeId="emp_123" isAdminView onApprove={...} onReject={...} onDelete={...} />
 */
export function ReviewsList({
  employeeId,
  isAdminView = false,
  onApprove,
  onReject,
  onDelete,
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch on mount and page change
  const fetchReviews = async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/reviews?employeeId=${employeeId}&page=${pageNum}&limit=10`
      );
      if (!res.ok) throw new Error('Failed to load reviews');

      const json = await res.json();
      const newReviews: Review[] = json.data ?? [];

      setReviews((prev) => (append ? [...prev, ...newReviews] : newReviews));
      setTotalPages(json.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchReviews(next, true);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 text-sm mb-2">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => fetchReviews(1)}>
          Retry
        </Button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
        <Star className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">No reviews yet</p>
        <p className="text-slate-400 text-xs mt-1">
          Be the first to share your experience
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aggregate rating header */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-3 pb-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${i < Math.round(reviews[0]?.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-slate-700">
            {reviews[0]?.rating.toFixed(1)} out of 5
          </span>
          <span className="text-sm text-slate-400">
            ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
          </span>
        </div>
      )}

      {/* Review cards */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            isAdmin={isAdminView}
            onApprove={onApprove}
            onReject={onReject}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Pagination */}
      {page < totalPages && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more reviews'}
          </Button>
        </div>
      )}
    </div>
  );
}