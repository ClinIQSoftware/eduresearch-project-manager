# Stripe Setup Guide

This guide covers setting up Stripe for your EduResearch project, which includes subscription management with Free/Starter/Team/Institution tiers.

## 1. Create a Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up for a new account (or use an existing one)
3. Complete email verification
4. Fill in your business details
5. Set up two-factor authentication (recommended)

## 2. Get Your API Keys

1. Go to the **Dashboard** → **Developers** → **API Keys**
2. You'll see two key pairs:
   - **Test Mode** (for development) - starts with `sk_test_` and `pk_test_`
   - **Live Mode** (for production) - starts with `sk_live_` and `pk_live_`

### Keys You Need:
- **Secret Key** (`STRIPE_SECRET_KEY`): Keep this private, use in backend only
- **Publishable Key** (`STRIPE_PUBLISHABLE_KEY`): Can be public, use in frontend

### Copy Your Test Keys:
- Note down your **Secret Key** (sk_test_...)
- Note down your **Publishable Key** (pk_test_...)

## 3. Create Products and Prices

### Create the Starter Product:

1. Go to **Products** → **Add Product**
2. Fill in details:
   - **Name**: "EduResearch Starter"
   - **Description**: "Starter subscription for EduResearch — up to 10 users, 15 projects"
3. Click **Save product**

#### Starter Monthly Price:
1. Go to your new product → **Pricing** → **Add price**
2. Set:
   - **Billing period**: Monthly
   - **Price**: 12.00 USD
   - **Recurring**: Enabled
3. Click **Save price**
4. **Copy the Price ID** (e.g., `price_1K...`) — this is `STRIPE_STARTER_PRICE_MONTHLY`

#### Starter Annual Price:
1. **Add another price**
2. Set:
   - **Billing period**: Yearly
   - **Price**: 120.00 USD
   - **Recurring**: Enabled
3. Click **Save price**
4. **Copy the Price ID** — this is `STRIPE_STARTER_PRICE_ANNUAL`

### Create the Team Product:

1. Go to **Products** → **Add Product**
2. Fill in details:
   - **Name**: "EduResearch Team"
   - **Description**: "Team subscription for EduResearch — up to 50 users, unlimited projects"
3. Click **Save product**

#### Team Monthly Price:
1. Go to your new product → **Pricing** → **Add price**
2. Set:
   - **Billing period**: Monthly
   - **Price**: 39.00 USD
   - **Recurring**: Enabled
3. Click **Save price**
4. **Copy the Price ID** — this is `STRIPE_TEAM_PRICE_MONTHLY`

#### Team Annual Price:
1. **Add another price**
2. Set:
   - **Billing period**: Yearly
   - **Price**: 390.00 USD
   - **Recurring**: Enabled
3. Click **Save price**
4. **Copy the Price ID** — this is `STRIPE_TEAM_PRICE_ANNUAL`

## 4. Set Up Webhooks

Webhooks allow Stripe to notify your backend about subscription events (checkout completed, subscription updated, etc.)

### Create Webhook Endpoint:

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Fill in:
   - **Endpoint URL**: `https://your-domain.com/api/billing/webhook`
     - For local development: Use ngrok to expose localhost (see below)
   - **Events**: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. Click **Add endpoint**

### Get Webhook Secret:

1. Click on your new webhook endpoint
2. Copy the **Signing Secret** (starts with `whsec_...`) - this is `STRIPE_WEBHOOK_SECRET`

### Local Development with ngrok:

To test webhooks locally:

```bash
# Install ngrok (if not already installed)
brew install ngrok

# Start ngrok tunnel to your local backend
ngrok http 8000

# This gives you a URL like: https://1234-567-890.ngrok.io

# In Stripe Dashboard Webhooks, use: https://1234-567-890.ngrok.io/api/billing/webhook
```

Update the webhook endpoint URL in Stripe dashboard whenever your ngrok URL changes.

## 5. Update Environment Variables

### Backend (.env or production secrets):

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...                    # Your actual secret key
STRIPE_WEBHOOK_SECRET=whsec_...                  # Your actual webhook secret
STRIPE_STARTER_PRICE_MONTHLY=price_...           # Starter monthly price ID
STRIPE_STARTER_PRICE_ANNUAL=price_...            # Starter annual price ID
STRIPE_TEAM_PRICE_MONTHLY=price_...              # Team monthly price ID
STRIPE_TEAM_PRICE_ANNUAL=price_...               # Team annual price ID
```

### Frontend (.env):

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your actual publishable key
```

## 6. Tier Summary

| Tier | Price | Users | Projects |
|------|-------|-------|----------|
| Free | $0 | 3 | 3 |
| Starter | $12/mo or $120/yr | 10 | 15 |
| Team | $39/mo or $390/yr | 50 | Unlimited |
| Institution | Custom | Unlimited | Unlimited |

## 7. Verify Setup

### Test the Backend:

```bash
# Install dependencies (if not already done)
pip install -r backend/requirements.txt

# Run migrations
cd backend && alembic upgrade head

# Start the backend
cd backend && python -m uvicorn app.main:app --reload
```

### Test Checkout Flow:

1. Go to your app → **Settings** → **Billing**
2. Click **Choose Starter** or **Choose Team**
3. Select **Monthly** or **Annual**
4. Use Stripe test card: **4242 4242 4242 4242**
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
5. Complete checkout
6. Check your backend logs for webhook success

### Monitor Webhooks:

In Stripe Dashboard → **Webhooks** → View your endpoint → **Logs**

You should see:
- `checkout.session.completed` event
- `customer.subscription.updated` event(s)

## 8. Transition to Production

Once testing is complete:

1. Switch to **Live Mode** in Stripe Dashboard
2. Get your **Live API Keys** (sk_live_... and pk_live_...)
3. Create **Live Products and Prices** for both Starter and Team (or replicate test setup)
4. Update environment variables in production with live keys
5. Update webhook endpoint URL to production domain
6. Update all 4 price environment variables with live price IDs

### Production Security Checklist:

- Use environment variables (never hardcode keys)
- Use HTTPS for webhook endpoint
- Verify webhook signatures (already implemented in code)
- Keep secret key secure (backend only)
- Rotate keys periodically
- Monitor failed webhooks in dashboard

## 9. Testing Scenarios

### Test Case 1: Successful Starter Upgrade

1. User clicks "Choose Starter" → "Subscribe Monthly"
2. Redirected to Stripe Checkout
3. Enter test card: `4242 4242 4242 4242`
4. Complete payment
5. Redirected to success page
6. Check database: `enterprise.plan_type` should be `"starter"`, `max_users` = 10, `max_projects` = 15

### Test Case 2: Successful Team Upgrade

1. User clicks "Choose Team" → "Subscribe Annually"
2. Same Stripe flow
3. Check database: `enterprise.plan_type` should be `"team"`, `max_users` = 50, `max_projects` = NULL

### Test Case 3: Failed Payment

Use card: `4000 0000 0000 0002` (declined)
- Should show error message
- Webhook should not trigger success event

### Test Case 4: Subscription Management

1. After successful upgrade, go to **Settings** → **Billing**
2. Click "Manage Billing"
3. Login to Stripe Customer Portal
4. Can view invoice, change payment method, cancel subscription

### Test Case 5: Subscription Cancellation

1. In Customer Portal, cancel subscription
2. Should see webhook: `customer.subscription.deleted`
3. Enterprise plan should downgrade to `"free"` with 3 users/3 projects limits

### Test Case 6: Starter → Team Upgrade

1. On Starter plan, go to **Settings** → **Billing**
2. Click "Upgrade to Team"
3. Select billing period and complete checkout
4. Verify plan changes to "team" with updated limits

## 10. Useful Stripe Dashboard URLs

- **Dashboard**: https://dashboard.stripe.com
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Products**: https://dashboard.stripe.com/products
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **Customers**: https://dashboard.stripe.com/customers
- **Payments**: https://dashboard.stripe.com/payments
- **Testing Guide**: https://stripe.com/docs/testing

## 11. Environment Variables Summary

**Backend**:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_MONTHLY=price_...
STRIPE_STARTER_PRICE_ANNUAL=price_...
STRIPE_TEAM_PRICE_MONTHLY=price_...
STRIPE_TEAM_PRICE_ANNUAL=price_...
```

**Frontend**:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

**Next Steps**:
1. Create Stripe account
2. Create Starter and Team products with monthly + annual prices
3. Get API Keys and Webhook Secret
4. Update `.env` files with all 6 backend variables + 1 frontend variable
5. Run migration: `cd backend && alembic upgrade head`
6. Test checkout flow for both tiers
7. Move to production when ready
