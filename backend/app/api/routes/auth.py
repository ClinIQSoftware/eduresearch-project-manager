"""Authentication routes for EduResearch Project Manager.

Handles user login, registration, profile management, and OAuth flows.
"""
import asyncio

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.api.deps import get_current_user, get_db
from app.config import settings
from app.models.user import User, AuthProvider
from app.models.institution import Institution
from app.models.organization import organization_admins
from app.models.department import Department
from app.schemas import (
    LoginRequest,
    PasswordChange,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.services import AuthService, UserService, SettingsService, EmailService

router = APIRouter()

# OAuth setup
oauth = OAuth()

if settings.google_client_id:
    oauth.register(
        name='google',
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )

if settings.microsoft_client_id:
    oauth.register(
        name='microsoft',
        client_id=settings.microsoft_client_id,
        client_secret=settings.microsoft_client_secret,
        authorize_url=f'https://login.microsoftonline.com/{settings.microsoft_tenant_id}/oauth2/v2.0/authorize',
        access_token_url=f'https://login.microsoftonline.com/{settings.microsoft_tenant_id}/oauth2/v2.0/token',
        client_kwargs={'scope': 'openid email profile'}
    )


def get_institution_admins(db: Session, institution_id: int):
    """Get all admins (including superusers) for an institution."""
    if not institution_id:
        # Get all superusers for users without institution
        return db.query(User).filter(User.is_superuser.is_(True), User.is_active.is_(True)).all()

    # Get institution admins
    admins = db.query(User).join(
        organization_admins,
        User.id == organization_admins.c.user_id
    ).filter(
        organization_admins.c.organization_id == institution_id,
        User.is_active.is_(True)
    ).all()

    # Also include superusers
    superusers = db.query(User).filter(User.is_superuser.is_(True), User.is_active.is_(True)).all()

    # Combine and deduplicate
    admin_ids = {a.id for a in admins}
    for su in superusers:
        if su.id not in admin_ids:
            admins.append(su)

    return admins


def send_approval_emails(
    background_tasks: BackgroundTasks,
    db: Session,
    user: User
):
    """Send approval request emails to institution admins."""
    admins = get_institution_admins(db, user.institution_id)

    # Get institution and department names
    institution_name = None
    department_name = None
    if user.institution_id:
        inst = db.query(Institution).filter(Institution.id == user.institution_id).first()
        institution_name = inst.name if inst else None
    if user.department_id:
        dept = db.query(Department).filter(Department.id == user.department_id).first()
        department_name = dept.name if dept else None

    user_name = f"{user.first_name} {user.last_name}".strip()

    email_service = EmailService(db)
    for admin in admins:
        background_tasks.add_task(
            email_service.send_user_approval_request,
            admin.email,
            user_name,
            user.email,
            institution_name,
            department_name
        )


async def send_approval_emails_async(db: Session, user: User):
    """Send approval request emails asynchronously (for OAuth callbacks)."""
    admins = get_institution_admins(db, user.institution_id)

    # Get institution and department names
    institution_name = None
    department_name = None
    if user.institution_id:
        inst = db.query(Institution).filter(Institution.id == user.institution_id).first()
        institution_name = inst.name if inst else None
    if user.department_id:
        dept = db.query(Department).filter(Department.id == user.department_id).first()
        department_name = dept.name if dept else None

    user_name = f"{user.first_name} {user.last_name}".strip()

    email_service = EmailService(db)
    for admin in admins:
        asyncio.create_task(
            email_service.send_user_approval_request(
                admin.email,
                user_name,
                user.email,
                institution_name,
                department_name
            )
        )


@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login with email and password.

    Returns a JWT access token on successful authentication.
    """
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
        approval_mode = getattr(system_settings, 'registration_approval_mode', 'block')

        if approval_mode == "block":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is pending approval. Please wait for an administrator to approve your registration."
            )

    return {"access_token": token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
def register(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Register a new user with email and password.

    If registration approval is required, the user will be created
    in a pending state and admins will be notified.
    """
    auth_service = AuthService(db)

    try:
        user = auth_service.register(user_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

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
    db: Session = Depends(get_db)
):
    """Update current user profile."""
    user_service = UserService(db)

    try:
        updated_user = user_service.update_profile(current_user, user_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return updated_user


@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user's password."""
    auth_service = AuthService(db)

    try:
        auth_service.change_password(
            current_user,
            password_data.current_password,
            password_data.new_password
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "Password changed successfully"}


@router.get("/google")
async def google_login(request: Request):
    """Initiate Google OAuth login."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )
    redirect_uri = f"{settings.backend_url}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback."""
    auth_service = AuthService(db)
    settings_service = SettingsService(db)

    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        email = user_info.get('email')
        given_name = user_info.get('given_name', '')
        family_name = user_info.get('family_name', '')
        if not given_name and not family_name:
            full_name = user_info.get('name', email.split('@')[0])
            parts = full_name.split(' ', 1)
            given_name = parts[0]
            family_name = parts[1] if len(parts) > 1 else ''
        oauth_id = user_info.get('sub')

        # Check if user exists
        from app.services import UserService
        user_service = UserService(db)
        existing_user = user_service.get_user_by_email(email)

        if existing_user:
            if existing_user.auth_provider != AuthProvider.google:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered with different authentication method"
                )
            user = existing_user
            access_token = auth_service.create_token(user)
        else:
            # Register via OAuth
            try:
                user, access_token = auth_service.register_oauth(
                    email=email,
                    first_name=given_name,
                    last_name=family_name,
                    provider="google",
                    oauth_id=oauth_id
                )
            except Exception as e:
                # User created but pending approval
                if "pending approval" in str(e).lower():
                    await send_approval_emails_async(db, user_service.get_user_by_email(email))
                    return RedirectResponse(
                        url=f"{settings.frontend_url}/login?error=Your account is pending approval"
                    )
                raise

        # Check approval status
        if not user.is_approved:
            system_settings = settings_service.get_system_settings()
            approval_mode = getattr(system_settings, 'registration_approval_mode', 'block')

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
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error={str(e)}"
        )


@router.get("/microsoft")
async def microsoft_login(request: Request):
    """Initiate Microsoft OAuth login."""
    if not settings.microsoft_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Microsoft OAuth not configured"
        )
    redirect_uri = f"{settings.backend_url}/api/auth/microsoft/callback"
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)


@router.get("/microsoft/callback")
async def microsoft_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Microsoft OAuth callback."""
    auth_service = AuthService(db)
    settings_service = SettingsService(db)

    try:
        token = await oauth.microsoft.authorize_access_token(request)

        # Get user info from Microsoft Graph
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                'https://graph.microsoft.com/v1.0/me',
                headers={'Authorization': f'Bearer {token["access_token"]}'}
            )
            user_info = resp.json()

        email = user_info.get('mail') or user_info.get('userPrincipalName')
        given_name = user_info.get('givenName', '')
        family_name = user_info.get('surname', '')
        if not given_name and not family_name:
            full_name = user_info.get('displayName', email.split('@')[0])
            parts = full_name.split(' ', 1)
            given_name = parts[0]
            family_name = parts[1] if len(parts) > 1 else ''
        oauth_id = user_info.get('id')

        # Check if user exists
        from app.services import UserService
        user_service = UserService(db)
        existing_user = user_service.get_user_by_email(email)

        if existing_user:
            if existing_user.auth_provider != AuthProvider.microsoft:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered with different authentication method"
                )
            user = existing_user
            access_token = auth_service.create_token(user)
        else:
            # Register via OAuth
            try:
                user, access_token = auth_service.register_oauth(
                    email=email,
                    first_name=given_name,
                    last_name=family_name,
                    provider="microsoft",
                    oauth_id=oauth_id
                )
            except Exception as e:
                if "pending approval" in str(e).lower():
                    await send_approval_emails_async(db, user_service.get_user_by_email(email))
                    return RedirectResponse(
                        url=f"{settings.frontend_url}/login?error=Your account is pending approval"
                    )
                raise

        # Check approval status
        if not user.is_approved:
            system_settings = settings_service.get_system_settings()
            approval_mode = getattr(system_settings, 'registration_approval_mode', 'block')

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
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error={str(e)}"
        )
