'use client';

import { FileText, Search, Users, Calendar, MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'file' | 'search' | 'users' | 'calendar' | 'message' | 'custom';
  customIcon?: React.ReactNode;
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons = {
  file: FileText,
  search: Search,
  users: Users,
  calendar: Calendar,
  message: MessageSquare,
};

export default function EmptyState({
  icon = 'file',
  customIcon,
  title = 'No data found',
  message = 'There is no data to display at the moment.',
  action,
}: EmptyStateProps) {
  const Icon = icon !== 'custom' ? icons[icon] : null;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mb-4">
        {customIcon || (Icon && <Icon className="w-8 h-8 text-text-muted" />)}
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-text-secondary text-sm mb-6 max-w-md">
        {message}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
