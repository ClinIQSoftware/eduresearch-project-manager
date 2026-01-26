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
