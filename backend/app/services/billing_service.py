"""Billing service for Stripe integration."""

import os
from datetime import datetime
from typing import Optional
from uuid import UUID

import stripe
from sqlalchemy.orm import Session

from app.models.enterprise import Enterprise

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Plan-specific Stripe price IDs
STARTER_PRICE_MONTHLY = os.getenv("STRIPE_STARTER_PRICE_MONTHLY")
STARTER_PRICE_ANNUAL = os.getenv("STRIPE_STARTER_PRICE_ANNUAL")
TEAM_PRICE_MONTHLY = os.getenv("STRIPE_TEAM_PRICE_MONTHLY")
TEAM_PRICE_ANNUAL = os.getenv("STRIPE_TEAM_PRICE_ANNUAL")

# Plan limits configuration
PLAN_LIMITS = {
    "free": {"max_users": 3, "max_projects": 3},
    "starter": {"max_users": 10, "max_projects": 15},
    "team": {"max_users": 50, "max_projects": None},  # None = unlimited
    "institution": {"max_users": None, "max_projects": None},
}

# Map Stripe price IDs to plan names (populated at runtime)
PRICE_TO_PLAN = {}


def _build_price_map():
    """Build mapping of Stripe price IDs to plan names."""
    for price_id in [STARTER_PRICE_MONTHLY, STARTER_PRICE_ANNUAL]:
        if price_id:
            PRICE_TO_PLAN[price_id] = "starter"
    for price_id in [TEAM_PRICE_MONTHLY, TEAM_PRICE_ANNUAL]:
        if price_id:
            PRICE_TO_PLAN[price_id] = "team"


_build_price_map()


class BillingService:
    """Service for handling Stripe billing operations."""

    def __init__(self, db: Session):
        self.db = db

    def _get_price_id(self, plan: str, price_type: str) -> str:
        """Get the Stripe price ID for a given plan and billing period."""
        price_map = {
            ("starter", "monthly"): STARTER_PRICE_MONTHLY,
            ("starter", "annual"): STARTER_PRICE_ANNUAL,
            ("team", "monthly"): TEAM_PRICE_MONTHLY,
            ("team", "annual"): TEAM_PRICE_ANNUAL,
        }
        price_id = price_map.get((plan, price_type))
        if not price_id:
            raise ValueError(f"No price configured for {plan} {price_type}")
        return price_id

    def create_checkout_session(
        self,
        enterprise: Enterprise,
        plan: str,
        price_type: str,
        success_url: str,
        cancel_url: str,
    ) -> str:
        """Create a Stripe Checkout session for upgrading."""
        price_id = self._get_price_id(plan, price_type)

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
            metadata={"enterprise_id": str(enterprise.id), "plan": plan},
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

    def _apply_plan_limits(self, enterprise: Enterprise, plan_name: str) -> None:
        """Apply the limits for a given plan to an enterprise."""
        limits = PLAN_LIMITS.get(plan_name, PLAN_LIMITS["free"])
        enterprise.plan_type = plan_name
        enterprise.max_users = limits["max_users"] or 9999
        enterprise.max_projects = limits["max_projects"]

    def handle_checkout_completed(self, session: dict) -> None:
        """Handle successful checkout - upgrade to the purchased plan."""
        enterprise_id = session.get("metadata", {}).get("enterprise_id")
        plan = session.get("metadata", {}).get("plan")
        subscription_id = session.get("subscription")

        if not enterprise_id or not plan:
            return

        enterprise = self.db.query(Enterprise).filter(
            Enterprise.id == UUID(enterprise_id)
        ).first()

        if enterprise:
            self._apply_plan_limits(enterprise, plan)
            enterprise.stripe_subscription_id = subscription_id
            enterprise.subscription_status = "active"
            self.db.commit()

    def handle_subscription_updated(self, subscription: dict) -> None:
        """Handle subscription update events (plan changes, renewals)."""
        subscription_id = subscription.get("id")
        status = subscription.get("status")
        current_period_end = subscription.get("current_period_end")

        enterprise = self.db.query(Enterprise).filter(
            Enterprise.stripe_subscription_id == subscription_id
        ).first()

        if enterprise:
            enterprise.subscription_status = status

            # Detect plan changes via the current price
            items = subscription.get("items", {}).get("data", [])
            if items:
                price_id = items[0].get("price", {}).get("id")
                new_plan = PRICE_TO_PLAN.get(price_id)
                if new_plan and new_plan != enterprise.plan_type:
                    self._apply_plan_limits(enterprise, new_plan)

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
            self._apply_plan_limits(enterprise, "free")
            enterprise.stripe_subscription_id = None
            enterprise.subscription_status = None
            enterprise.current_period_end = None
            self.db.commit()

    def get_subscription_status(self, enterprise: Enterprise) -> dict:
        """Get current subscription status with usage counts."""
        from app.models.user import User
        from app.models.project import Project

        current_users = self.db.query(User).filter(
            User.enterprise_id == enterprise.id,
            User.is_approved.is_(True),
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
