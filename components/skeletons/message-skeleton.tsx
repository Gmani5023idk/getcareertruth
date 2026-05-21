'use client';

import Skeleton from '@/components/ui/skeleton';

export default function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && <Skeleton variant="circular" width={32} height={32} />}
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="rounded-2xl px-4 py-3 bg-surface-2">
          <Skeleton variant="text" width={200} />
          <Skeleton variant="text" width={150} />
        </div>
        <Skeleton variant="text" width={60} className="mt-1" />
      </div>
    </div>
  );
}
