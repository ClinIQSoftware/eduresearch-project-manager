import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSubscription, createCheckoutSession, createPortalSession } from '../../api/billing';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckSquare } from 'lucide-react';

const PAID_PLANS = ['starter', 'team', 'institution'];

const tierInfo = [
  {
    key: 'starter' as const,
    name: 'Starter',
    description: 'For research labs',
    monthlyPrice: 12,
    annualPrice: 120,
    features: ['Up to 10 users', 'Up to 15 projects', 'File sharing & full reports', 'Email support'],
  },
  {
    key: 'team' as const,
    name: 'Team',
    description: 'For departments',
    monthlyPrice: 39,
    annualPrice: 390,
    features: ['Up to 50 users', 'Unlimited projects', 'Cross-institutional collaboration', 'Priority support'],
    highlighted: true,
  },
];

export default function BillingSettings() {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'team' | null>(null);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => getSubscription().then(r => r.data),
  });

  const handleUpgrade = async (plan: 'starter' | 'team', priceType: 'monthly' | 'annual') => {
    setLoading(`${plan}-${priceType}`);
    try {
      const response = await createCheckoutSession(plan, priceType);
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading('portal');
    try {
      const response = await createPortalSession();
      window.location.href = response.data.portal_url;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      setLoading(null);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  const isPaid = PAID_PLANS.includes(subscription?.plan_type ?? '');
  const usagePercent = subscription ? (subscription.current_users / subscription.max_users) * 100 : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Billing & Subscription</h2>

      {/* Current Plan */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold capitalize">{subscription?.plan_type}</span>
            {subscription?.subscription_status && (
              <span className="ml-2 text-sm text-gray-500">({subscription.subscription_status})</span>
            )}
          </div>
          {isPaid && (
            <Button variant="secondary" onClick={handleManageBilling} disabled={loading === 'portal'}>
              {loading === 'portal' ? 'Loading...' : 'Manage Billing'}
            </Button>
          )}
        </div>
      </Card>

      {/* Usage */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Usage</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Users</span>
              <span>{subscription?.current_users} / {subscription?.max_users}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Projects</span>
              <span>
                {subscription?.current_projects} / {subscription?.max_projects ?? 'Unlimited'}
              </span>
            </div>
            {subscription?.max_projects && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${(subscription.current_projects / subscription.max_projects) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Upgrade Options - Tier Selector */}
      {!isPaid && !selectedPlan && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Upgrade Your Plan</h3>
          <p className="text-gray-600 mb-6">Choose the plan that fits your team.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {tierInfo.map((tier) => (
              <div
                key={tier.key}
                className={`border rounded-lg p-6 ${tier.highlighted ? 'ring-2 ring-blue-600 border-blue-600' : 'border-gray-200'}`}
              >
                <h4 className="text-xl font-semibold">{tier.name}</h4>
                <p className="text-gray-600 text-sm mt-1">{tier.description}</p>
                <div className="mt-3 flex items-baseline">
                  <span className="text-3xl font-bold">${tier.monthlyPrice}</span>
                  <span className="text-gray-600 ml-1">/month</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center text-sm text-gray-600">
                      <CheckSquare className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => setSelectedPlan(tier.key)}
                  className={`w-full mt-6 ${tier.highlighted ? '' : ''}`}
                >
                  Choose {tier.name}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Billing Period Selection */}
      {!isPaid && selectedPlan && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Choose billing for {selectedPlan === 'starter' ? 'Starter' : 'Team'}
            </h3>
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to plans
            </button>
          </div>
          {(() => {
            const tier = tierInfo.find(t => t.key === selectedPlan)!;
            const annualSavings = (tier.monthlyPrice * 12) - tier.annualPrice;
            return (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">${tier.monthlyPrice}<span className="text-sm font-normal">/month</span></div>
                  <p className="text-gray-600 text-sm mb-4">Billed monthly</p>
                  <Button
                    onClick={() => handleUpgrade(selectedPlan, 'monthly')}
                    disabled={loading === `${selectedPlan}-monthly`}
                    className="w-full"
                  >
                    {loading === `${selectedPlan}-monthly` ? 'Loading...' : 'Subscribe Monthly'}
                  </Button>
                </div>
                <div className="border rounded-lg p-4 border-blue-500">
                  <div className="text-2xl font-bold">${tier.annualPrice}<span className="text-sm font-normal">/year</span></div>
                  <p className="text-gray-600 text-sm mb-4">Save ${annualSavings}/year</p>
                  <Button
                    onClick={() => handleUpgrade(selectedPlan, 'annual')}
                    disabled={loading === `${selectedPlan}-annual`}
                    className="w-full"
                  >
                    {loading === `${selectedPlan}-annual` ? 'Loading...' : 'Subscribe Annually'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      {/* Upgrade from Starter to Team */}
      {subscription?.plan_type === 'starter' && !selectedPlan && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Need more capacity?</h3>
          <p className="text-gray-600 mb-4">
            Upgrade to Team for up to 50 users and unlimited projects.
          </p>
          <Button onClick={() => setSelectedPlan('team')}>
            Upgrade to Team
          </Button>
        </Card>
      )}

      {/* Starter→Team billing period selection */}
      {subscription?.plan_type === 'starter' && selectedPlan === 'team' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upgrade to Team</h3>
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Cancel
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-2xl font-bold">$39<span className="text-sm font-normal">/month</span></div>
              <p className="text-gray-600 text-sm mb-4">Billed monthly</p>
              <Button
                onClick={() => handleUpgrade('team', 'monthly')}
                disabled={loading === 'team-monthly'}
                className="w-full"
              >
                {loading === 'team-monthly' ? 'Loading...' : 'Subscribe Monthly'}
              </Button>
            </div>
            <div className="border rounded-lg p-4 border-blue-500">
              <div className="text-2xl font-bold">$390<span className="text-sm font-normal">/year</span></div>
              <p className="text-gray-600 text-sm mb-4">Save $78/year</p>
              <Button
                onClick={() => handleUpgrade('team', 'annual')}
                disabled={loading === 'team-annual'}
                className="w-full"
              >
                {loading === 'team-annual' ? 'Loading...' : 'Subscribe Annually'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
