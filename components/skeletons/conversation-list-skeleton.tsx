'use client';

import Skeleton from '@/components/ui/skeleton';

export default function ConversationListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 flex items-center gap-3">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width={60} />
            </div>
            <Skeleton variant="text" width="70%" />
          </div>
        </div>
      ))}
    </div>
  );
}
