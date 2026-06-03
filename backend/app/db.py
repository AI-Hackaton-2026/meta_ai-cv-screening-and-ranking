from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings
from app.services.contact import extract_email

engine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def create_tables() -> None:
    """Create all tables on startup. Called from app lifespan."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        columns = await conn.exec_driver_sql("PRAGMA table_info(candidates)")
        candidate_columns = columns.fetchall()
        if candidate_columns and "storage_path" not in {row[1] for row in candidate_columns}:
            await conn.exec_driver_sql(
                "ALTER TABLE candidates ADD COLUMN storage_path VARCHAR(1000)"
            )
        if candidate_columns and "email" not in {row[1] for row in candidate_columns}:
            await conn.exec_driver_sql("ALTER TABLE candidates ADD COLUMN email VARCHAR(320)")
            rows = await conn.exec_driver_sql("SELECT id, raw_text FROM candidates")
            for candidate_id, raw_text in rows.fetchall():
                email = extract_email(raw_text or "")
                if email:
                    await conn.exec_driver_sql(
                        "UPDATE candidates SET email = ? WHERE id = ?",
                        (email, candidate_id),
                    )


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session per request."""
    async with AsyncSessionLocal() as session:
        yield session
