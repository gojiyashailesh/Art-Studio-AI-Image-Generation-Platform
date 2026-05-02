from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Session, create_engine

import app.models  # noqa: F401 - registers SQLModel tables before create_all().
from app.core.config import DATABASE_URL, SQL_ECHO


engine = create_engine(
    DATABASE_URL,
    echo=SQL_ECHO,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    ensure_compatible_schema()


def ensure_compatible_schema() -> None:
    inspector = inspect(engine)
    if "job" not in inspector.get_table_names():
        return

    job_columns = {column["name"] for column in inspector.get_columns("job")}
    if "user_id" not in job_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE job ADD COLUMN user_id VARCHAR"))


def get_session():
    with Session(engine) as session:
        yield session
