import { client } from './client';

export interface SubscriptionStatus {
  plan_type: string;
  max_users: number;
  max_projects: number | null;
  current_users: number;
  current_projects: number;
  subscription_status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export const createCheckoutSession = (plan: 'starter' | 'team', priceType: 'monthly' | 'annual') =>
  client.post<{ checkout_url: string }>('/billing/create-checkout-session', { plan, price_type: priceType });

export const createPortalSession = () =>
  client.post<{ portal_url: string }>('/billing/create-portal-session');

export const getSubscription = () =>
  client.get<SubscriptionStatus>('/billing/subscription');
