# Landing Page & SaaS Subscription Design

## Overview

Add a public landing page and Stripe-based subscription system with three pricing tiers.

## Pricing Tiers

| Tier | Users | Projects | Price | Billing |
|------|-------|----------|-------|---------|
| Free | 5 | 5 | $0 | - |
| Pro | 10 | Unlimited | $29/mo or $290/yr | Stripe Checkout |
| Enterprise | Custom | Unlimited | Custom | Stripe (custom price) |

## Architecture

### Database Schema

Add fields to `Enterprise` model:

```python
class PlanType(str, Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"

# New fields on Enterprise
plan_type: PlanType = "free"
max_users: int = 5          # 5 free, 10 pro, custom enterprise
max_projects: int | None = 5  # 5 free, None (unlimited) for pro/enterprise
stripe_customer_id: str | None
stripe_subscription_id: str | None
subscription_status: str | None  # active, canceled, past_due
current_period_end: datetime | None
```

### Landing Page Structure

```
┌─────────────────────────────────────────────────────┐
│  Logo                    Features | Pricing | Login │
├─────────────────────────────────────────────────────┤
│     Manage Research Projects                        │
│     Collaborate Across Institutions                 │
│     [Get Started Free]  [View Pricing]              │
├─────────────────────────────────────────────────────┤
│  📋 Projects    👥 Teams    📁 Files    ✓ Tasks    │
├─────────────────────────────────────────────────────┤
│           Free        Pro         Enterprise        │
│           $0          $29/mo      Custom            │
│           5 users     10 users    Unlimited         │
│         [Start Free] [Upgrade]   [Contact Us]       │
├─────────────────────────────────────────────────────┤
│  © 2026 EduResearch  |  Terms  |  Privacy          │
└─────────────────────────────────────────────────────┘
```

### API Endpoints

**Billing Routes (`/api/billing`):**

```
POST /api/billing/create-checkout-session
  Input: { "price_type": "monthly" | "annual" }
  Returns: { "checkout_url": "https://checkout.stripe.com/..." }

POST /api/billing/create-portal-session
  Returns: { "portal_url": "https://billing.stripe.com/..." }

GET /api/billing/subscription
  Returns: { "plan_type", "status", "current_period_end", "cancel_at_period_end" }

POST /api/billing/webhook
  Handles: checkout.session.completed, customer.subscription.updated/deleted
```

### Frontend Routes

- `/` → Landing page (public)
- `/pricing` → Pricing section (anchor or separate page)
- `/settings/billing` → Subscription management
- `/billing/success` → Post-checkout success
- `/billing/cancel` → Checkout cancelled

### Stripe Setup

**Products & Prices:**
- Product: "EduResearch Pro"
- Price (Monthly): $29/month
- Price (Annual): $290/year

**Environment Variables:**
```
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
```

### Limit Enforcement

**User Creation:**
```python
if current_users >= enterprise.max_users:
    raise HTTPException(403, {"code": "USER_LIMIT_REACHED", "max": enterprise.max_users})
```

**Project Creation:**
```python
if enterprise.max_projects and current_projects >= enterprise.max_projects:
    raise HTTPException(403, {"code": "PROJECT_LIMIT_REACHED", "max": enterprise.max_projects})
```

### Frontend Billing UI

**Upgrade Banner (Dashboard):**
```
⚠️ You're using 4 of 5 users on your Free plan. [Upgrade to Pro →]
```

**Billing Settings Page:**
- Current plan display
- Usage meters (users/projects)
- Upgrade buttons for monthly/annual
- Stripe Customer Portal link for managing subscription

### User Flow

1. Visitor lands on `/` (landing page)
2. Clicks "Get Started Free" → `/register`
3. Creates account → Free tier (5 users, 5 projects)
4. Uses app, hits limits
5. Clicks "Upgrade" → Stripe Checkout
6. Completes payment → Webhook updates plan_type to "pro"
7. Limits increased (10 users, unlimited projects)

### Files to Create/Modify

**Backend:**
- `backend/app/api/routes/billing.py` - New billing endpoints
- `backend/app/services/billing_service.py` - Stripe integration
- `backend/app/schemas/billing.py` - Request/response schemas
- `backend/alembic/versions/018_add_subscription_fields.py` - Migration
- `backend/app/models/enterprise.py` - Add subscription fields

**Frontend:**
- `frontend/src/pages/Landing.tsx` - Public landing page
- `frontend/src/pages/billing/BillingSettings.tsx` - Subscription management
- `frontend/src/pages/billing/BillingSuccess.tsx` - Success page
- `frontend/src/pages/billing/BillingCancel.tsx` - Cancel page
- `frontend/src/api/billing.ts` - API functions
- `frontend/src/components/UpgradeBanner.tsx` - Limit warning banner
- `frontend/src/App.tsx` - Add new routes
