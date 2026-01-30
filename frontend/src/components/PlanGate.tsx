import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSubscription } from '../api/billing';

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  team: 2,
  institution: 3,
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  team: 'Team',
  institution: 'Institution',
};

interface PlanGateProps {
  /** Minimum plan required to access this feature */
  requiredPlan: 'starter' | 'team' | 'institution';
  /** The feature name to display in the locked message */
  featureName: string;
  children: React.ReactNode;
}

/**
 * Wraps content that requires a specific plan tier.
 * Shows an upgrade prompt if the user's plan is below the requirement.
 */
export default function PlanGate({ requiredPlan, featureName, children }: PlanGateProps) {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => getSubscription().then(r => r.data),
    staleTime: 60000,
  });

  if (isLoading) return <>{children}</>;

  const currentPlan = subscription?.plan_type || 'free';
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const requiredRank = PLAN_RANK[requiredPlan] ?? 1;

  if (currentRank >= requiredRank) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-lg mx-auto py-12 text-center">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
        <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {featureName}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          This feature is available on the <span className="font-medium">{PLAN_LABELS[requiredPlan]}</span> plan and above.
          Upgrade to unlock {featureName.toLowerCase()}.
        </p>
        <Link
          to="/settings/billing"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          View Plans & Upgrade
        </Link>
      </div>
    </div>
  );
}

/**
 * Small inline badge showing plan requirement.
 * Used in tab labels to indicate locked features.
 */
export function PlanBadge({ plan }: { plan: string }) {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => getSubscription().then(r => r.data),
    staleTime: 60000,
  });

  const currentPlan = subscription?.plan_type || 'free';
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const requiredRank = PLAN_RANK[plan] ?? 1;

  if (currentRank >= requiredRank) return null;

  return (
    <Lock className="inline w-3 h-3 ml-1 text-gray-400" />
  );
}
