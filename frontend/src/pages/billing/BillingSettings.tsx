import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSubscription, createCheckoutSession, createPortalSession } from '../../api/billing';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function BillingSettings() {
  const [loading, setLoading] = useState<string | null>(null);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => getSubscription().then(r => r.data),
  });

  const handleUpgrade = async (priceType: 'monthly' | 'annual') => {
    setLoading(priceType);
    try {
      const response = await createCheckoutSession(priceType);
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

  const isPro = subscription?.plan_type === 'pro';
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
          {isPro && (
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

      {/* Upgrade Options */}
      {!isPro && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upgrade to Pro</h3>
          <p className="text-gray-600 mb-6">Get 10 users and unlimited projects.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-2xl font-bold">$29<span className="text-sm font-normal">/month</span></div>
              <p className="text-gray-600 text-sm mb-4">Billed monthly</p>
              <Button onClick={() => handleUpgrade('monthly')} disabled={loading === 'monthly'} className="w-full">
                {loading === 'monthly' ? 'Loading...' : 'Upgrade Monthly'}
              </Button>
            </div>
            <div className="border rounded-lg p-4 border-blue-500">
              <div className="text-2xl font-bold">$290<span className="text-sm font-normal">/year</span></div>
              <p className="text-gray-600 text-sm mb-4">Save $58/year</p>
              <Button onClick={() => handleUpgrade('annual')} disabled={loading === 'annual'} className="w-full">
                {loading === 'annual' ? 'Loading...' : 'Upgrade Annual'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
