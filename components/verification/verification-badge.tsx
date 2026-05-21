import { CheckCircle, XCircle, Clock } from 'lucide-react';

export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'UNVERIFIED' | 'REJECTED';

interface VerificationBadgeProps {
  status: VerificationStatus;
  method?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function VerificationBadge({
  status,
  method,
  size = 'md',
  showText = true,
}: VerificationBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'VERIFIED':
        return {
          icon: CheckCircle,
          color: 'text-teal-500',
          bgColor: 'bg-teal-50',
          borderColor: 'border-teal-200',
          text: 'Verified',
        };
      case 'PENDING':
        return {
          icon: Clock,
          color: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          text: 'Pending',
        };
      case 'UNVERIFIED':
        return {
          icon: XCircle,
          color: 'text-slate-400',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          text: 'Unverified',
        };
      case 'REJECTED':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Rejected',
        };
      default:
        return {
          icon: XCircle,
          color: 'text-slate-400',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          text: 'Unknown',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (!showText) {
    return (
      <div className={`inline-flex items-center justify-center ${config.bgColor} ${config.borderColor} border rounded-full p-1`}>
        <Icon className={`${sizeClasses[size]} ${config.color}`} />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bgColor} ${config.borderColor} border`}>
      <Icon className={`${sizeClasses[size]} ${config.color}`} />
      <span className={`${textSizeClasses[size]} font-medium ${config.color}`}>
        {config.text}
      </span>
      {method && status === 'VERIFIED' && (
        <span className={`text-xs ${config.color} opacity-75`}>
          via {method}
        </span>
      )}
    </div>
  );
}
