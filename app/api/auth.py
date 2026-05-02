from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.config import AUTH_SESSION_DAYS
from app.db.session import get_session
from app.models import AuthSession, User
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserResponse
from app.services.security import (
    hash_password,
    hash_token,
    make_session_token,
    password_needs_rehash,
    verify_password,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_loaded_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, name=user.name, email=user.email)


def create_auth_session(user: User, session: Session) -> str:
    token = make_session_token()
    auth_session = AuthSession(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=utc_now() + timedelta(days=AUTH_SESSION_DAYS),
    )
    session.add(auth_session)
    session.commit()
    return token


def extract_token(
    authorization: Optional[str] = Header(default=None),
    access_token: Optional[str] = Query(default=None),
) -> str:
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value:
            return value.strip()

    if access_token:
        return access_token.strip()

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required.",
    )


def get_current_user(
    token: str = Depends(extract_token),
    session: Session = Depends(get_session),
) -> User:
    auth_session = session.exec(
        select(AuthSession).where(AuthSession.token_hash == hash_token(token))
    ).first()
    if not auth_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )

    if normalize_loaded_datetime(auth_session.expires_at) <= utc_now():
        session.delete(auth_session)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )

    user = session.get(User, auth_session.user_id)
    if not user:
        session.delete(auth_session)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )

    return user


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(request: SignupRequest, session: Session = Depends(get_session)):
    existing_user = session.exec(
        select(User).where(User.email == request.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_auth_session(user, session)
    return AuthResponse(access_token=token, user=user_response(user))


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == request.email)).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(request.password)
        user.updated_at = utc_now()
        session.add(user)

    token = create_auth_session(user, session)
    return AuthResponse(access_token=token, user=user_response(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return user_response(current_user)


@router.post("/logout")
def logout(
    token: str = Depends(extract_token),
    session: Session = Depends(get_session),
):
    auth_session = session.exec(
        select(AuthSession).where(AuthSession.token_hash == hash_token(token))
    ).first()
    if auth_session:
        session.delete(auth_session)
        session.commit()
    return {"status": "ok"}
