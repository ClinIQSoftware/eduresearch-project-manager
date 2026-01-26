import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { getSubscription } from '../api/billing';

export default function UpgradeBanner() {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => getSubscription().then(r => r.data),
    staleTime: 60000, // 1 minute
  });

  if (!subscription || subscription.plan_type !== 'free') {
    return null;
  }

  const usagePercent = (subscription.current_users / subscription.max_users) * 100;

  if (usagePercent < 80) {
    return null;
  }

  const isAtLimit = usagePercent >= 100;

  return (
    <div className={`px-4 py-3 ${isAtLimit ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border-b`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${isAtLimit ? 'text-red-500' : 'text-yellow-500'}`} />
          <span className={`text-sm ${isAtLimit ? 'text-red-700' : 'text-yellow-700'}`}>
            {isAtLimit
              ? `You've reached your ${subscription.max_users} user limit.`
              : `You're using ${subscription.current_users} of ${subscription.max_users} users on your Free plan.`}
          </span>
        </div>
        <Link
          to="/settings/billing"
          className={`text-sm font-medium ${isAtLimit ? 'text-red-700 hover:text-red-800' : 'text-yellow-700 hover:text-yellow-800'}`}
        >
          Upgrade to Pro →
        </Link>
      </div>
    </div>
  );
}
