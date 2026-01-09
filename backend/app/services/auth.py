from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not user.password_hash:
        return None  # OAuth user trying to login with password
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create_user(
    db: Session,
    email: str,
    password: str,
    name: str,
    department: Optional[str] = None,
    phone: Optional[str] = None,
    bio: Optional[str] = None,
    organization_id: Optional[int] = None,
    is_superuser: bool = False
) -> User:
    hashed_password = get_password_hash(password)
    user = User(
        email=email,
        password_hash=hashed_password,
        name=name,
        department=department,
        phone=phone,
        bio=bio,
        organization_id=organization_id,
        is_superuser=is_superuser
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_oauth_user(
    db: Session,
    email: str,
    name: str,
    auth_provider: str,
    oauth_id: str,
    organization_id: Optional[int] = None
) -> User:
    from app.models.user import AuthProvider
    user = User(
        email=email,
        name=name,
        auth_provider=AuthProvider(auth_provider),
        oauth_id=oauth_id,
        organization_id=organization_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
