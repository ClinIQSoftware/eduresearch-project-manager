"""Billing API routes for subscription management."""

import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import stripe

from app.api.deps import get_tenant_db, get_platform_db, get_current_user
from app.config import settings
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

    if enterprise.plan_type == request_data.plan:
        raise HTTPException(status_code=400, detail=f"Already on {request_data.plan} plan")

    if enterprise.plan_type == "institution":
        raise HTTPException(status_code=400, detail="Institution plans are managed separately")

    service = BillingService(db)
    frontend_url = settings.frontend_url.rstrip("/")

    checkout_url = service.create_checkout_session(
        enterprise=enterprise,
        plan=request_data.plan,
        price_type=request_data.price_type,
        success_url=f"{frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend_url}/billing/cancel",
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
    frontend_url = settings.frontend_url.rstrip("/")

    portal_url = service.create_portal_session(
        enterprise=enterprise,
        return_url=f"{frontend_url}/settings/billing",
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
async def stripe_webhook(request: Request, db: Session = Depends(get_platform_db)):
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
