# Landing Page & Subscription Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add public landing page and Stripe subscription system with Free/Pro/Enterprise tiers.

**Architecture:** Stripe Checkout for payment, webhook for subscription events, Enterprise model holds subscription state, limit enforcement on user/project creation.

**Tech Stack:** FastAPI, SQLAlchemy, Stripe Python SDK, React, Tailwind CSS

---

## Task 1: Add Stripe Dependency and Environment Variables

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/.env.example`
- Modify: `frontend/.env.example`

**Step 1: Add stripe to requirements.txt**

Add after the existing dependencies:
```
# Payments
stripe==7.0.0
```

**Step 2: Update backend .env.example**

Add:
```
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
```

**Step 3: Update frontend .env.example**

Add:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Step 4: Commit**

```bash
git add backend/requirements.txt backend/.env.example frontend/.env.example
git commit -m "chore: add Stripe dependency and env vars"
```

---

## Task 2: Add Subscription Fields to Enterprise Model

**Files:**
- Modify: `backend/app/models/enterprise.py`
- Create: `backend/alembic/versions/019_add_subscription_fields.py`

**Step 1: Update Enterprise model**

Add imports and fields:
```python
from enum import Enum
from sqlalchemy import Integer, DateTime

class PlanType(str, Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"

# Add to Enterprise class after existing fields:
plan_type: Mapped[str] = mapped_column(String(20), default="free", nullable=False)
max_users: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
max_projects: Mapped[Optional[int]] = mapped_column(Integer, default=5, nullable=True)  # None = unlimited
stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
subscription_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
```

**Step 2: Create migration**

```python
"""Add subscription fields to enterprises.

Revision ID: 019
Revises: 018
Create Date: 2026-01-25
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("enterprises", sa.Column("plan_type", sa.String(20), nullable=False, server_default="free"))
    op.add_column("enterprises", sa.Column("max_users", sa.Integer(), nullable=False, server_default="5"))
    op.add_column("enterprises", sa.Column("max_projects", sa.Integer(), nullable=True, server_default="5"))
    op.add_column("enterprises", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    op.add_column("enterprises", sa.Column("stripe_subscription_id", sa.String(255), nullable=True))
    op.add_column("enterprises", sa.Column("subscription_status", sa.String(50), nullable=True))
    op.add_column("enterprises", sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("enterprises", "current_period_end")
    op.drop_column("enterprises", "subscription_status")
    op.drop_column("enterprises", "stripe_subscription_id")
    op.drop_column("enterprises", "stripe_customer_id")
    op.drop_column("enterprises", "max_projects")
    op.drop_column("enterprises", "max_users")
    op.drop_column("enterprises", "plan_type")
```

**Step 3: Commit**

```bash
git add backend/app/models/enterprise.py backend/alembic/versions/019_add_subscription_fields.py
git commit -m "feat: add subscription fields to Enterprise model"
```

---

## Task 3: Create Billing Schemas

**Files:**
- Create: `backend/app/schemas/billing.py`

**Step 1: Create billing schemas**

```python
"""Billing-related Pydantic schemas."""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class CreateCheckoutSessionRequest(BaseModel):
    """Request to create a Stripe checkout session."""
    price_type: Literal["monthly", "annual"]


class CheckoutSessionResponse(BaseModel):
    """Response with checkout URL."""
    checkout_url: str


class PortalSessionResponse(BaseModel):
    """Response with customer portal URL."""
    portal_url: str


class SubscriptionStatus(BaseModel):
    """Current subscription status."""
    plan_type: str
    max_users: int
    max_projects: Optional[int]
    current_users: int
    current_projects: int
    subscription_status: Optional[str]
    current_period_end: Optional[datetime]
    cancel_at_period_end: bool = False


class WebhookEvent(BaseModel):
    """Stripe webhook event wrapper."""
    type: str
    data: dict
```

**Step 2: Add to schemas __init__.py**

Add import to `backend/app/schemas/__init__.py`.

**Step 3: Commit**

```bash
git add backend/app/schemas/billing.py backend/app/schemas/__init__.py
git commit -m "feat: add billing Pydantic schemas"
```

---

## Task 4: Create Billing Service

**Files:**
- Create: `backend/app/services/billing_service.py`

**Step 1: Create billing service**

```python
"""Billing service for Stripe integration."""

import os
from datetime import datetime
from typing import Optional
from uuid import UUID

import stripe
from sqlalchemy.orm import Session

from app.models.enterprise import Enterprise

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

PRICE_MONTHLY = os.getenv("STRIPE_PRICE_MONTHLY")
PRICE_ANNUAL = os.getenv("STRIPE_PRICE_ANNUAL")


class BillingService:
    """Service for handling Stripe billing operations."""

    def __init__(self, db: Session):
        self.db = db

    def create_checkout_session(
        self,
        enterprise: Enterprise,
        price_type: str,
        success_url: str,
        cancel_url: str,
    ) -> str:
        """Create a Stripe Checkout session for upgrading to Pro."""
        price_id = PRICE_MONTHLY if price_type == "monthly" else PRICE_ANNUAL

        # Create or get Stripe customer
        if not enterprise.stripe_customer_id:
            customer = stripe.Customer.create(
                metadata={"enterprise_id": str(enterprise.id), "enterprise_name": enterprise.name}
            )
            enterprise.stripe_customer_id = customer.id
            self.db.commit()

        session = stripe.checkout.Session.create(
            customer=enterprise.stripe_customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"enterprise_id": str(enterprise.id)},
        )

        return session.url

    def create_portal_session(self, enterprise: Enterprise, return_url: str) -> str:
        """Create a Stripe Customer Portal session."""
        if not enterprise.stripe_customer_id:
            raise ValueError("No Stripe customer ID for this enterprise")

        session = stripe.billing_portal.Session.create(
            customer=enterprise.stripe_customer_id,
            return_url=return_url,
        )

        return session.url

    def handle_checkout_completed(self, session: dict) -> None:
        """Handle successful checkout - upgrade to Pro."""
        enterprise_id = session.get("metadata", {}).get("enterprise_id")
        subscription_id = session.get("subscription")

        if not enterprise_id:
            return

        enterprise = self.db.query(Enterprise).filter(
            Enterprise.id == UUID(enterprise_id)
        ).first()

        if enterprise:
            enterprise.plan_type = "pro"
            enterprise.max_users = 10
            enterprise.max_projects = None  # Unlimited
            enterprise.stripe_subscription_id = subscription_id
            enterprise.subscription_status = "active"
            self.db.commit()

    def handle_subscription_updated(self, subscription: dict) -> None:
        """Handle subscription update events."""
        subscription_id = subscription.get("id")
        status = subscription.get("status")
        current_period_end = subscription.get("current_period_end")

        enterprise = self.db.query(Enterprise).filter(
            Enterprise.stripe_subscription_id == subscription_id
        ).first()

        if enterprise:
            enterprise.subscription_status = status
            if current_period_end:
                enterprise.current_period_end = datetime.fromtimestamp(current_period_end)
            self.db.commit()

    def handle_subscription_deleted(self, subscription: dict) -> None:
        """Handle subscription cancellation - downgrade to Free."""
        subscription_id = subscription.get("id")

        enterprise = self.db.query(Enterprise).filter(
            Enterprise.stripe_subscription_id == subscription_id
        ).first()

        if enterprise:
            enterprise.plan_type = "free"
            enterprise.max_users = 5
            enterprise.max_projects = 5
            enterprise.stripe_subscription_id = None
            enterprise.subscription_status = None
            enterprise.current_period_end = None
            self.db.commit()

    def get_subscription_status(self, enterprise: Enterprise) -> dict:
        """Get current subscription status with usage counts."""
        from app.models.user import User
        from app.models.project import Project

        current_users = self.db.query(User).filter(
            User.enterprise_id == enterprise.id
        ).count()

        current_projects = self.db.query(Project).filter(
            Project.enterprise_id == enterprise.id
        ).count()

        return {
            "plan_type": enterprise.plan_type,
            "max_users": enterprise.max_users,
            "max_projects": enterprise.max_projects,
            "current_users": current_users,
            "current_projects": current_projects,
            "subscription_status": enterprise.subscription_status,
            "current_period_end": enterprise.current_period_end,
            "cancel_at_period_end": False,  # TODO: Check from Stripe if needed
        }
```

**Step 2: Add to services __init__.py**

Add import to `backend/app/services/__init__.py`.

**Step 3: Commit**

```bash
git add backend/app/services/billing_service.py backend/app/services/__init__.py
git commit -m "feat: add billing service with Stripe integration"
```

---

## Task 5: Create Billing API Routes

**Files:**
- Create: `backend/app/api/routes/billing.py`
- Modify: `backend/app/api/routes/__init__.py`
- Modify: `backend/app/main.py`

**Step 1: Create billing routes**

```python
"""Billing API routes for subscription management."""

import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import stripe

from app.api.deps import get_tenant_db, get_current_user
from app.models.user import User
from app.models.enterprise import Enterprise
from app.schemas.billing import (
    CreateCheckoutSessionRequest,
    CheckoutSessionResponse,
    PortalSessionResponse,
    SubscriptionStatus,
)
from app.services.billing_service import BillingService

router = APIRouter(prefix="/billing", tags=["billing"])

WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
def create_checkout_session(
    request_data: CreateCheckoutSessionRequest,
    request: Request,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Checkout session for Pro upgrade."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage billing",
        )

    enterprise = db.query(Enterprise).filter(
        Enterprise.id == request.state.enterprise_id
    ).first()

    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")

    if enterprise.plan_type == "pro":
        raise HTTPException(status_code=400, detail="Already on Pro plan")

    service = BillingService(db)
    base_url = str(request.base_url).rstrip("/")

    checkout_url = service.create_checkout_session(
        enterprise=enterprise,
        price_type=request_data.price_type,
        success_url=f"{base_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base_url}/billing/cancel",
    )

    return CheckoutSessionResponse(checkout_url=checkout_url)


@router.post("/create-portal-session", response_model=PortalSessionResponse)
def create_portal_session(
    request: Request,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Customer Portal session."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage billing",
        )

    enterprise = db.query(Enterprise).filter(
        Enterprise.id == request.state.enterprise_id
    ).first()

    if not enterprise or not enterprise.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")

    service = BillingService(db)
    base_url = str(request.base_url).rstrip("/")

    portal_url = service.create_portal_session(
        enterprise=enterprise,
        return_url=f"{base_url}/settings/billing",
    )

    return PortalSessionResponse(portal_url=portal_url)


@router.get("/subscription", response_model=SubscriptionStatus)
def get_subscription(
    request: Request,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
):
    """Get current subscription status."""
    enterprise = db.query(Enterprise).filter(
        Enterprise.id == request.state.enterprise_id
    ).first()

    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")

    service = BillingService(db)
    return service.get_subscription_status(enterprise)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_tenant_db)):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    service = BillingService(db)

    if event["type"] == "checkout.session.completed":
        service.handle_checkout_completed(event["data"]["object"])
    elif event["type"] == "customer.subscription.updated":
        service.handle_subscription_updated(event["data"]["object"])
    elif event["type"] == "customer.subscription.deleted":
        service.handle_subscription_deleted(event["data"]["object"])

    return {"status": "ok"}
```

**Step 2: Register router in main.py**

Add to the router includes in `backend/app/main.py`:
```python
from app.api.routes.billing import router as billing_router
app.include_router(billing_router, prefix="/api")
```

**Step 3: Commit**

```bash
git add backend/app/api/routes/billing.py backend/app/main.py
git commit -m "feat: add billing API routes"
```

---

## Task 6: Add Limit Enforcement to User and Project Creation

**Files:**
- Modify: `backend/app/api/routes/users.py`
- Modify: `backend/app/api/routes/projects.py`

**Step 1: Add user limit check**

In the user creation endpoint, add before creating the user:
```python
from app.models.enterprise import Enterprise

# Check user limit
enterprise = db.query(Enterprise).filter(Enterprise.id == request.state.enterprise_id).first()
if enterprise:
    current_users = db.query(User).filter(User.enterprise_id == enterprise.id).count()
    if current_users >= enterprise.max_users:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "USER_LIMIT_REACHED", "max": enterprise.max_users},
        )
```

**Step 2: Add project limit check**

In the project creation endpoint, add before creating the project:
```python
from app.models.enterprise import Enterprise

# Check project limit
enterprise = db.query(Enterprise).filter(Enterprise.id == request.state.enterprise_id).first()
if enterprise and enterprise.max_projects is not None:
    current_projects = db.query(Project).filter(Project.enterprise_id == enterprise.id).count()
    if current_projects >= enterprise.max_projects:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "PROJECT_LIMIT_REACHED", "max": enterprise.max_projects},
        )
```

**Step 3: Commit**

```bash
git add backend/app/api/routes/users.py backend/app/api/routes/projects.py
git commit -m "feat: add user and project limit enforcement"
```

---

## Task 7: Create Frontend Landing Page

**Files:**
- Create: `frontend/src/pages/Landing.tsx`

**Step 1: Create Landing page component**

```typescript
import { Link } from 'react-router-dom';
import { FileText, Users, FolderOpen, CheckSquare } from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Projects',
    description: 'Organize research projects with clear timelines and milestones.',
  },
  {
    icon: Users,
    title: 'Teams',
    description: 'Collaborate across institutions and departments seamlessly.',
  },
  {
    icon: FolderOpen,
    title: 'Files',
    description: 'Share documents, datasets, and research materials securely.',
  },
  {
    icon: CheckSquare,
    title: 'Tasks',
    description: 'Track progress with assignments, deadlines, and status updates.',
  },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'For small research teams',
    features: ['Up to 5 users', 'Up to 5 projects', 'Basic features'],
    cta: 'Get Started Free',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing institutions',
    features: ['Up to 10 users', 'Unlimited projects', 'Priority support'],
    cta: 'Start Free, Upgrade Later',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: ['Unlimited users', 'Unlimited projects', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact Us',
    href: 'mailto:sales@eduresearch.app',
    highlighted: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-xl font-bold text-blue-600">EduResearch</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Manage Research Projects
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Collaborate across institutions, track progress, and deliver results.
            The project management platform built for education and research.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700"
            >
              Get Started Free
            </Link>
            <a
              href="#pricing"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to manage research
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white p-6 rounded-xl shadow-sm">
                <feature.icon className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Start free and upgrade as your team grows. No hidden fees.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl p-8 ${
                  plan.highlighted ? 'ring-2 ring-blue-600 shadow-lg' : 'shadow-sm'
                }`}
              >
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
                <p className="text-gray-600 mt-2">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center text-gray-600">
                      <CheckSquare className="w-5 h-5 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href}
                  className={`mt-8 block text-center py-3 rounded-lg font-medium ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">&copy; 2026 EduResearch. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="/terms" className="text-gray-600 hover:text-gray-900">Terms</a>
              <a href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat: add public landing page component"
```

---

## Task 8: Create Billing Pages and API

**Files:**
- Create: `frontend/src/api/billing.ts`
- Create: `frontend/src/pages/billing/BillingSettings.tsx`
- Create: `frontend/src/pages/billing/BillingSuccess.tsx`
- Create: `frontend/src/pages/billing/BillingCancel.tsx`
- Create: `frontend/src/pages/billing/index.ts`

**Step 1: Create billing API functions**

```typescript
// frontend/src/api/billing.ts
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

export const createCheckoutSession = (priceType: 'monthly' | 'annual') =>
  client.post<{ checkout_url: string }>('/billing/create-checkout-session', { price_type: priceType });

export const createPortalSession = () =>
  client.post<{ portal_url: string }>('/billing/create-portal-session');

export const getSubscription = () =>
  client.get<SubscriptionStatus>('/billing/subscription');
```

**Step 2: Create BillingSettings page**

```typescript
// frontend/src/pages/billing/BillingSettings.tsx
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
            <Button variant="outline" onClick={handleManageBilling} disabled={loading === 'portal'}>
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
```

**Step 3: Create BillingSuccess page**

```typescript
// frontend/src/pages/billing/BillingSuccess.tsx
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function BillingSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Welcome to Pro!</h1>
        <p className="text-gray-600 mb-6">Your account has been upgraded successfully.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
```

**Step 4: Create BillingCancel page**

```typescript
// frontend/src/pages/billing/BillingCancel.tsx
import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function BillingCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Upgrade Cancelled</h1>
        <p className="text-gray-600 mb-6">No worries! You can upgrade anytime from your settings.</p>
        <Link to="/settings/billing" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Back to Billing
        </Link>
      </div>
    </div>
  );
}
```

**Step 5: Create index.ts export**

```typescript
// frontend/src/pages/billing/index.ts
export { default as BillingSettings } from './BillingSettings';
export { default as BillingSuccess } from './BillingSuccess';
export { default as BillingCancel } from './BillingCancel';
```

**Step 6: Commit**

```bash
git add frontend/src/api/billing.ts frontend/src/pages/billing/
git commit -m "feat: add billing pages and API functions"
```

---

## Task 9: Update App Router with New Routes

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add imports**

```typescript
import Landing from './pages/Landing';
import { BillingSettings, BillingSuccess, BillingCancel } from './pages/billing';
```

**Step 2: Add Landing route**

Replace the root route to show Landing for unauthenticated users. Add before the protected routes:
```typescript
{/* Public routes */}
<Route path="/" element={<Landing />} />
<Route path="/login" element={<Login />} />
```

**Step 3: Add billing routes**

Add after the settings routes:
```typescript
{/* Billing routes */}
<Route path="/billing/success" element={<BillingSuccess />} />
<Route path="/billing/cancel" element={<BillingCancel />} />
<Route
  path="/settings/billing"
  element={
    <ProtectedRoute>
      <Layout>
        <BillingSettings />
      </Layout>
    </ProtectedRoute>
  }
/>
```

**Step 4: Update dashboard route**

Change the dashboard from `/` to `/dashboard`:
```typescript
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Layout>
        <Dashboard />
      </Layout>
    </ProtectedRoute>
  }
/>
```

**Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: update routing for landing page and billing"
```

---

## Task 10: Create Upgrade Banner Component

**Files:**
- Create: `frontend/src/components/UpgradeBanner.tsx`
- Modify: `frontend/src/components/layout/Layout.tsx`

**Step 1: Create UpgradeBanner component**

```typescript
// frontend/src/components/UpgradeBanner.tsx
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
```

**Step 2: Add UpgradeBanner to Layout**

Import and add at the top of the Layout component's return:
```typescript
import UpgradeBanner from '../UpgradeBanner';

// In the Layout return, add before the main content:
<UpgradeBanner />
```

**Step 3: Commit**

```bash
git add frontend/src/components/UpgradeBanner.tsx frontend/src/components/layout/Layout.tsx
git commit -m "feat: add upgrade banner for limit warnings"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Add Stripe dependency and environment variables |
| 2 | Add subscription fields to Enterprise model |
| 3 | Create billing schemas |
| 4 | Create billing service |
| 5 | Create billing API routes |
| 6 | Add limit enforcement |
| 7 | Create landing page |
| 8 | Create billing pages and API |
| 9 | Update app router |
| 10 | Create upgrade banner |
