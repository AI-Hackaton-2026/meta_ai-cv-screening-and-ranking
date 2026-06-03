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


def _system_ssl_context() -> ssl.SSLContext:
    """OS trust store (works on Render/Linux when certifi-only fails)."""
    return _clear_x509_strict(ssl.create_default_context())


def _certifi_ssl_context() -> ssl.SSLContext:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.load_verify_locations(cafile=_CERTIFI_CA)
    return _clear_x509_strict(ctx)


def _truststore_ssl_context() -> ssl.SSLContext:
    import truststore

    return _clear_x509_strict(truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT))


def _insecure_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _ssl_context_candidates() -> list[Callable[[], ssl.SSLContext] | None]:
    """
    None = let asyncpg use ssl=True (platform default context).
    Order tuned per OS; Render/Linux usually succeeds with system CAs first.
    """
    factories: list[Callable[[], ssl.SSLContext] | None] = []
    if sys.platform == "darwin":
        factories.extend([_truststore_ssl_context, _certifi_ssl_context, _system_ssl_context])
    else:
        factories.extend([_system_ssl_context, _certifi_ssl_context, None])
    if settings.database_ssl_insecure:
        factories.append(_insecure_ssl_context)
    return factories


def _is_ssl_verify_error(exc: BaseException) -> bool:
    if isinstance(exc, ssl.SSLCertVerificationError):
        return True
    message = str(exc).upper()
    return "CERTIFICATE_VERIFY_FAILED" in message or "CERTIFICATE VERIFY FAILED" in message


async def _asyncpg_connect():
    url = make_url(settings.database_url)
    if not url.host or not url.username:
        raise RuntimeError("DATABASE_URL must include host and username")

    connect_kwargs = {
        "host": url.host,
        "port": url.port or 5432,
        "user": url.username,
        "password": url.password or "",
        "database": url.database or "postgres",
    }

    ssl_attempts: list[bool | ssl.SSLContext | str] = [
        True if factory is None else factory() for factory in _ssl_context_candidates()
    ]
    # libpq sslmode=require — TLS without cert verify (Supabase pooler on some cloud hosts).
    ssl_attempts.append("require")
    if settings.database_ssl_insecure:
        ssl_attempts.append(_insecure_ssl_context())

    errors: list[Exception] = []
    for ssl_arg in ssl_attempts:
        try:
            conn = await asyncpg.connect(**connect_kwargs, ssl=ssl_arg)
            if ssl_arg == "require":
                logger.warning(
                    "Postgres connected with ssl=require (encrypted; certificate not verified). "
                    "Typical for Supabase pooler on Render when verify-full fails."
                )
            return conn
        except Exception as exc:
            if not _is_ssl_verify_error(exc):
                raise
            errors.append(exc)

    hint = (
        " Confirm DATABASE_URL is the Supabase session pooler (port 5432). "
        "For local dev behind a corporate proxy, set DATABASE_SSL_INSECURE=true."
        if not settings.database_ssl_insecure
        else ""
    )
    raise RuntimeError(
        f"Postgres SSL connection failed for {url.host}.{hint} Last error: {errors[-1]}"
    ) from errors[-1]


engine = create_async_engine(
    settings.database_url,
    echo=False,
    async_creator=_asyncpg_connect,
    pool_pre_ping=True,
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
