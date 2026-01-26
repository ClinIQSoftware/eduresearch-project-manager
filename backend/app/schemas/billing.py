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
