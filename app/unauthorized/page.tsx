import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">403</h1>
        <p className="text-2xl text-slate-300 mb-8">Access Denied</p>
        <p className="text-slate-400 mb-8">You don't have permission to access this resource.</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
