import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant }) => {
  const getVariantClasses = () => {
    if (variant) {
      const variants = {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-yellow-100 text-yellow-700',
        error: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
      };
      return variants[variant];
    }

    // Auto-detect based on status text
    const statusLower = status.toLowerCase();
    if (statusLower.includes('active') || statusLower.includes('approved') || statusLower.includes('accepted') || statusLower.includes('available') || statusLower.includes('completed')) {
      return 'bg-green-100 text-green-700';
    }
    if (statusLower.includes('pending') || statusLower.includes('draft') || statusLower.includes('submitted')) {
      return 'bg-yellow-100 text-yellow-700';
    }
    if (statusLower.includes('rejected') || statusLower.includes('cancelled') || statusLower.includes('expired') || statusLower.includes('inactive') || statusLower.includes('withdrawn')) {
      return 'bg-red-100 text-red-700';
    }
    if (statusLower.includes('open') || statusLower.includes('assigned')) {
      return 'bg-blue-100 text-blue-700';
    }
    if (statusLower.includes('closed')) {
      return 'bg-gray-100 text-gray-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getVariantClasses()}`}>
      {status}
    </span>
  );
};
