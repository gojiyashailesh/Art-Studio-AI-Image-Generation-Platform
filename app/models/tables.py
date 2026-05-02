from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from sqlmodel import Field, Relationship, SQLModel


def _uuid() -> str:
    return str(uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    name: str = Field(default="", min_length=2, max_length=80)
    email: str = Field(default="", index=True, unique=True, max_length=255)
    password_hash: str = Field(default="")
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)

    sessions: List["AuthSession"] = Relationship(back_populates="user")
    jobs: List["Job"] = Relationship(back_populates="user")


class AuthSession(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(default="", index=True, unique=True)
    created_at: datetime = Field(default_factory=_now)
    expires_at: datetime

    user: Optional[User] = Relationship(back_populates="sessions")


class Thumbnail(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    job_id: str = Field(foreign_key="job.id")
    style_name: str = Field(default="")
    status: str = Field(default="pending")
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
    imagekit_url: str = Field(default="")
    error_message: str = Field(default="")

    job: Optional["Job"] = Relationship(back_populates="thumbnails")


class Job(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: Optional[str] = Field(default=None, foreign_key="user.id", index=True)
    prompt: str = Field(default="")
    num_thumbnails: int = Field(default=1, ge=1, le=3)
    headshot_url: str = Field(default="")
    status: str = Field(default="pending")
    created_at: datetime = Field(default_factory=_now)

    user: Optional[User] = Relationship(back_populates="jobs")
    thumbnails: List[Thumbnail] = Relationship(back_populates="job")
