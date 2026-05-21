'use client';

import Skeleton from '@/components/ui/skeleton';

export default function EmployeeCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-6">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton variant="circular" width={64} height={64} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="70%" />
      </div>
      <div className="flex gap-2 mb-4">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width={100} />
        <Skeleton variant="rectangular" width={120} height={40} />
      </div>
    </div>
  );
}
