from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from app.database import get_db
from app.config import settings
from app.schemas.user import (
    UserCreate, UserResponse, UserUpdate, Token, LoginRequest
)
from app.services.auth import (
    authenticate_user, create_user, create_oauth_user,
    get_user_by_email, create_access_token, get_password_hash
)
from app.dependencies import get_current_user
from app.models.user import User, AuthProvider
from app.models.system_settings import SystemSettings


def get_system_settings(db: Session) -> SystemSettings:
    """Get global system settings."""
    settings_obj = db.query(SystemSettings).filter(
        SystemSettings.organization_id == None
    ).first()
    return settings_obj

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


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email and password."""
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if registration approval is required
    sys_settings = get_system_settings(db)
    require_approval = sys_settings.require_registration_approval if sys_settings else False

    user = create_user(
        db=db,
        email=user_data.email,
        password=user_data.password,
        name=user_data.name,
        department=user_data.department,
        phone=user_data.phone,
        bio=user_data.bio,
        organization_id=user_data.organization_id,
        is_approved=not require_approval  # Pending if approval required
    )
    return user


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password."""
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is approved
    if not user.is_approved:
        sys_settings = get_system_settings(db)
        approval_mode = sys_settings.registration_approval_mode if sys_settings else "block"

        if approval_mode == "block":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is pending approval. Please wait for an administrator to approve your registration."
            )
        # If "limited" mode, allow login but frontend should handle restricted access

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    return {"access_token": access_token, "token_type": "bearer"}


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
    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    return current_user


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
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        email = user_info.get('email')
        name = user_info.get('name', email.split('@')[0])
        oauth_id = user_info.get('sub')

        # Check if user exists
        user = get_user_by_email(db, email)
        if not user:
            # Create new user
            user = create_oauth_user(
                db=db,
                email=email,
                name=name,
                auth_provider="google",
                oauth_id=oauth_id
            )
        elif user.auth_provider != AuthProvider.google:
            # User exists but with different auth method
            raise HTTPException(
                status_code=400,
                detail="Email already registered with different authentication method"
            )

        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})

        # Redirect to frontend with token
        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback?token={access_token}"
        )

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
        name = user_info.get('displayName', email.split('@')[0])
        oauth_id = user_info.get('id')

        # Check if user exists
        user = get_user_by_email(db, email)
        if not user:
            user = create_oauth_user(
                db=db,
                email=email,
                name=name,
                auth_provider="microsoft",
                oauth_id=oauth_id
            )
        elif user.auth_provider != AuthProvider.microsoft:
            raise HTTPException(
                status_code=400,
                detail="Email already registered with different authentication method"
            )

        access_token = create_access_token(data={"sub": str(user.id)})

        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback?token={access_token}"
        )

    except Exception as e:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error={str(e)}"
        )
