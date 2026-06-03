import logging
import os
import ssl
import sys
from collections.abc import AsyncGenerator, Callable

import asyncpg
import certifi
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

_CERTIFI_CA = certifi.where()
os.environ.setdefault("SSL_CERT_FILE", _CERTIFI_CA)
os.environ.setdefault("REQUESTS_CA_BUNDLE", _CERTIFI_CA)


def _clear_x509_strict(ctx: ssl.SSLContext) -> ssl.SSLContext:
    if hasattr(ssl, "VERIFY_X509_STRICT"):
        ctx.verify_flags &= ~ssl.VERIFY_X509_STRICT
    return ctx


def _certifi_ssl_context() -> ssl.SSLContext:
    return _clear_x509_strict(ssl.create_default_context(cafile=_CERTIFI_CA))


def _truststore_ssl_context() -> ssl.SSLContext:
    import truststore

    return _clear_x509_strict(truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT))


def _insecure_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _ssl_context_candidates() -> list[Callable[[], ssl.SSLContext]]:
    factories: list[Callable[[], ssl.SSLContext]] = []
    if sys.platform == "darwin":
        factories.extend([_truststore_ssl_context, _certifi_ssl_context])
    else:
        factories.append(_certifi_ssl_context)
    if settings.database_ssl_insecure:
        factories.append(_insecure_ssl_context)
    return factories


async def _asyncpg_connect():
    url = make_url(settings.database_url)
    if not url.host or not url.username:
        raise RuntimeError("DATABASE_URL must include host and username")

    errors: list[Exception] = []
    for factory in _ssl_context_candidates():
        try:
            return await asyncpg.connect(
                host=url.host,
                port=url.port or 5432,
                user=url.username,
                password=url.password or "",
                database=url.database or "postgres",
                ssl=factory(),
            )
        except ssl.SSLCertVerificationError as exc:
            errors.append(exc)

    hint = (
        " Set DATABASE_SSL_INSECURE=true in backend/.env for local dev behind a "
        "corporate SSL proxy (never on production)."
        if not settings.database_ssl_insecure
        else ""
    )
    raise RuntimeError(
        "Postgres SSL verification failed. Use the Supabase session pooler URL "
        f"(port 5432).{hint} Last error: {errors[-1]}"
    ) from errors[-1]


engine = create_async_engine(
    settings.database_url,
    echo=False,
    async_creator=_asyncpg_connect,
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
    if settings.database_ssl_insecure:
        logger.warning(
            "DATABASE_SSL_INSECURE is enabled — TLS is encrypted but not verified. "
            "Disable on production."
        )


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session per request."""
    async with AsyncSessionLocal() as session:
        yield session
