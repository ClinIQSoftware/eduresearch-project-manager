"""Authentication routes for EduResearch Project Manager.

Handles user login, registration, profile management, and OAuth flows.
"""

from uuid import UUID

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.api.deps import get_current_enterprise_id, get_current_user, get_unscoped_db, get_tenant_db
from app.config import settings
from app.models.user import User, AuthProvider
from app.models.organization import organization_admins
from app.schemas import (
    LoginRequest,
    OnboardingRequest,
    PasswordChange,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.schemas.user import OnboardingResponse
from app.services import AuthService, UserService, SettingsService, EmailService

router = APIRouter()

# OAuth setup
oauth = OAuth()

if settings.google_client_id:
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if settings.microsoft_client_id:
    oauth.register(
        name="microsoft",
        client_id=settings.microsoft_client_id,
        client_secret=settings.microsoft_client_secret,
        authorize_url=f"https://login.microsoftonline.com/{settings.microsoft_tenant_id}/oauth2/v2.0/authorize",
        access_token_url=f"https://login.microsoftonline.com/{settings.microsoft_tenant_id}/oauth2/v2.0/token",
        client_kwargs={"scope": "openid email profile"},
    )


def get_institution_admins(db: Session, institution_id: int):
    """Get all admins (including superusers) for an institution."""
    if not institution_id:
        # Get all superusers for users without institution
        return (
            db.query(User)
            .filter(User.is_superuser.is_(True), User.is_active.is_(True))
            .all()
        )

    # Get institution admins
    admins = (
        db.query(User)
        .join(organization_admins, User.id == organization_admins.c.user_id)
        .filter(
            organization_admins.c.organization_id == institution_id,
            User.is_active.is_(True),
        )
        .all()
    )

    # Also include superusers
    superusers = (
        db.query(User)
        .filter(User.is_superuser.is_(True), User.is_active.is_(True))
        .all()
    )

    # Combine and deduplicate
    admin_ids = {a.id for a in admins}
    for su in superusers:
        if su.id not in admin_ids:
            admins.append(su)

    return admins


def send_approval_emails(background_tasks: BackgroundTasks, db: Session, user: User):
    """Send approval request emails to institution admins."""
    admins = get_institution_admins(db, user.institution_id)
    if admins:
        email_service = EmailService(db)
        background_tasks.add_task(email_service.send_approval_request, user, admins)


async def send_approval_emails_async(db: Session, user: User):
    """Send approval request emails asynchronously (for OAuth callbacks).

    Runs the synchronous SMTP send in a threadpool to avoid
    blocking the event loop during OAuth callback handling.
    """
    import asyncio

    admins = get_institution_admins(db, user.institution_id)
    if admins:
        email_service = EmailService(db)
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None, email_service.send_approval_request, user, admins
        )


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_unscoped_db)):
    """Login with email and password.

    Checks platform_admins table first, then falls back to users table.
    Returns a JWT access token on successful authentication.
    """
    from app.models.platform_admin import PlatformAdmin
    from app.core.security import verify_password, create_access_token

    # First check if this is a platform admin
    platform_admin = (
        db.query(PlatformAdmin)
        .filter(PlatformAdmin.email == login_data.email)
        .first()
    )

    if platform_admin:
        if not platform_admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        if not verify_password(login_data.password, platform_admin.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create token with platform admin flag
        token = create_access_token(
            data={
                "sub": str(platform_admin.id),
                "email": platform_admin.email,
                "is_platform_admin": True,
            }
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "is_platform_admin": True,
        }

    # Fall back to regular user authentication
    auth_service = AuthService(db)
    settings_service = SettingsService(db)

    try:
        user, token = auth_service.login(login_data.email, login_data.password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check registration approval mode
    if not user.is_approved:
        system_settings = settings_service.get_system_settings()
        approval_mode = getattr(system_settings, "registration_approval_mode", "block")

        if approval_mode == "block":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is pending approval. Please wait for an administrator to approve your registration.",
            )

    return {"access_token": token, "token_type": "bearer", "is_platform_admin": False}


@router.post("/register", response_model=UserResponse)
def register(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_unscoped_db),
):
    """Register a new user with email and password.

    Creates an account only — no team association.
    Users complete onboarding (create/join team) separately via POST /auth/onboarding.
    """
    auth_service = AuthService(db)

    try:
        user = auth_service.register(user_data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Send approval request emails if needed
    if not user.is_approved:
        send_approval_emails(background_tasks, db, user)

    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_unscoped_db),
):
    """Update current user profile."""
    user_service = UserService(db)

    try:
        updated_user = user_service.update_profile(current_user, user_data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return updated_user


@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_unscoped_db),
):
    """Change current user's password."""
    auth_service = AuthService(db)

    try:
        auth_service.change_password(
            current_user, password_data.current_password, password_data.new_password
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "Password changed successfully"}


@router.get("/google")
async def google_login(request: Request):
    """Initiate Google OAuth login."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured",
        )
    redirect_uri = f"{settings.backend_url}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_unscoped_db),
):
    """Handle Google OAuth callback."""
    auth_service = AuthService(db)
    settings_service = SettingsService(db)
    enterprise_id = getattr(request.state, "enterprise_id", None)

    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")

        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        email = user_info.get("email")
        given_name = user_info.get("given_name", "")
        family_name = user_info.get("family_name", "")
        if not given_name and not family_name:
            full_name = user_info.get("name", email.split("@")[0])
            parts = full_name.split(" ", 1)
            given_name = parts[0]
            family_name = parts[1] if len(parts) > 1 else ""
        oauth_id = user_info.get("sub")

        # Check if user exists
        from app.services import UserService

        user_service = UserService(db)
        existing_user = user_service.get_user_by_email(email)

        if existing_user:
            if existing_user.auth_provider != AuthProvider.google:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered with different authentication method",
                )
            user = existing_user
            access_token = auth_service.create_token(user)
        else:
            # Register via OAuth — no enterprise required (two-step registration)
            try:
                user, access_token = auth_service.register_oauth(
                    email=email,
                    first_name=given_name,
                    last_name=family_name,
                    provider="google",
                    oauth_id=oauth_id,
                    enterprise_id=enterprise_id,
                )
            except Exception as e:
                # User created but pending approval
                if "pending approval" in str(e).lower():
                    await send_approval_emails_async(
                        db, user_service.get_user_by_email(email)
                    )
                    return RedirectResponse(
                        url=f"{settings.frontend_url}/login?error=Your account is pending approval"
                    )
                raise

        # Check approval status
        if not user.is_approved:
            system_settings = settings_service.get_system_settings()
            approval_mode = getattr(
                system_settings, "registration_approval_mode", "block"
            )

            if approval_mode == "block":
                return RedirectResponse(
                    url=f"{settings.frontend_url}/login?error=Your account is pending approval"
                )

        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback?token={access_token}"
        )

    except HTTPException:
        raise
    except Exception as e:
        return RedirectResponse(url=f"{settings.frontend_url}/login?error={str(e)}")


@router.get("/microsoft")
async def microsoft_login(request: Request):
    """Initiate Microsoft OAuth login."""
    if not settings.microsoft_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Microsoft OAuth not configured",
        )
    redirect_uri = f"{settings.backend_url}/api/auth/microsoft/callback"
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)


@router.get("/microsoft/callback")
async def microsoft_callback(
    request: Request,
    db: Session = Depends(get_unscoped_db),
):
    """Handle Microsoft OAuth callback."""
    auth_service = AuthService(db)
    settings_service = SettingsService(db)
    enterprise_id = getattr(request.state, "enterprise_id", None)

    try:
        token = await oauth.microsoft.authorize_access_token(request)

        # Get user info from Microsoft Graph
        import httpx

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {token['access_token']}"},
            )
            user_info = resp.json()

        email = user_info.get("mail") or user_info.get("userPrincipalName")
        given_name = user_info.get("givenName", "")
        family_name = user_info.get("surname", "")
        if not given_name and not family_name:
            full_name = user_info.get("displayName", email.split("@")[0])
            parts = full_name.split(" ", 1)
            given_name = parts[0]
            family_name = parts[1] if len(parts) > 1 else ""
        oauth_id = user_info.get("id")

        # Check if user exists
        from app.services import UserService

        user_service = UserService(db)
        existing_user = user_service.get_user_by_email(email)

        if existing_user:
            if existing_user.auth_provider != AuthProvider.microsoft:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered with different authentication method",
                )
            user = existing_user
            access_token = auth_service.create_token(user)
        else:
            # Register via OAuth — no enterprise required (two-step registration)
            try:
                user, access_token = auth_service.register_oauth(
                    email=email,
                    first_name=given_name,
                    last_name=family_name,
                    provider="microsoft",
                    oauth_id=oauth_id,
                    enterprise_id=enterprise_id,
                )
            except Exception as e:
                if "pending approval" in str(e).lower():
                    await send_approval_emails_async(
                        db, user_service.get_user_by_email(email)
                    )
                    return RedirectResponse(
                        url=f"{settings.frontend_url}/login?error=Your account is pending approval"
                    )
                raise

        # Check approval status
        if not user.is_approved:
            system_settings = settings_service.get_system_settings()
            approval_mode = getattr(
                system_settings, "registration_approval_mode", "block"
            )

            if approval_mode == "block":
                return RedirectResponse(
                    url=f"{settings.frontend_url}/login?error=Your account is pending approval"
                )

        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback?token={access_token}"
        )

    except HTTPException:
        raise
    except Exception as e:
        return RedirectResponse(url=f"{settings.frontend_url}/login?error={str(e)}")


@router.post("/onboarding", response_model=OnboardingResponse)
def complete_onboarding(
    data: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_unscoped_db),
):
    """Complete onboarding by creating or joining a team.

    Returns the updated user plus a fresh JWT that includes enterprise_id,
    so the frontend can use it for subsequent tenant-scoped API calls.
    """
    from app.models.invite_code import InviteCode
    from app.models.enterprise import Enterprise
    import uuid as uuid_mod
    import re

    # Re-fetch the user within this session (current_user comes from a different session)
    current_user = db.merge(current_user)

    if current_user.enterprise_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already part of a team",
        )

    if data.mode == "create":
        if not data.enterprise_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team name is required when creating a team",
            )

        name = data.enterprise_name.strip()
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        if not slug:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid team name",
            )

        from app.api.routes.platform_admin import RESERVED_SLUGS
        if slug in RESERVED_SLUGS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The name '{name}' cannot be used",
            )

        existing = db.query(Enterprise).filter(Enterprise.slug == slug).first()
        if existing:
            slug = f"{slug}-{uuid_mod.uuid4().hex[:6]}"

        enterprise = Enterprise(
            slug=slug,
            name=name,
            is_active=True,
            plan_type="free",
            max_users=3,
            max_projects=3,
        )
        db.add(enterprise)
        db.flush()

        # Set user as enterprise admin
        current_user.enterprise_id = enterprise.id
        current_user.is_superuser = True
        current_user.is_approved = True
        db.commit()
        db.refresh(current_user)

        # Issue fresh JWT with enterprise_id for tenant-scoped API calls
        auth_service = AuthService(db)
        new_token = auth_service.create_token(current_user)
        return OnboardingResponse(
            user=UserResponse.model_validate(current_user),
            access_token=new_token,
        )

    elif data.mode == "join":
        if not data.invite_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite code is required when joining a team",
            )

        invite = db.query(InviteCode).filter(
            InviteCode.code == data.invite_code
        ).first()
        if not invite:
            try:
                token_uuid = uuid_mod.UUID(data.invite_code)
                invite = db.query(InviteCode).filter(
                    InviteCode.token == token_uuid
                ).first()
            except (ValueError, TypeError):
                pass

        if not invite or not invite.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired invite code",
            )

        # Join the enterprise
        current_user.enterprise_id = invite.enterprise_id
        current_user.is_approved = True
        db.flush()

        # Increment invite code use count
        db_invite = db.query(InviteCode).filter(InviteCode.id == invite.id).first()
        if db_invite:
            db_invite.use_count += 1

        db.commit()
        db.refresh(current_user)

        # Issue fresh JWT with enterprise_id for tenant-scoped API calls
        auth_service = AuthService(db)
        new_token = auth_service.create_token(current_user)
        return OnboardingResponse(
            user=UserResponse.model_validate(current_user),
            access_token=new_token,
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid onboarding mode",
    )
