"""Supabase Storage integration for original CV files."""

from pathlib import Path
from urllib.parse import quote, urlsplit
from uuid import uuid4

import httpx

from app.config import settings


class StorageError(Exception):
    pass


def _storage_headers() -> dict[str, str]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise StorageError("Supabase Storage is not configured")
    return {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }


def _storage_url(path: str = "") -> str:
    if not settings.supabase_url:
        raise StorageError("Supabase Storage is not configured")
    project_url = settings.supabase_url.rstrip("/")
    parsed_url = urlsplit(project_url)
    if not parsed_url.scheme or not parsed_url.netloc:
        raise StorageError("SUPABASE_URL must include http:// or https://")
    if parsed_url.path:
        raise StorageError(
            "SUPABASE_URL must be the project root URL without /rest/v1 or another path"
        )
    bucket = quote(settings.supabase_storage_bucket, safe="")
    encoded_path = quote(path, safe="/")
    return f"{project_url}/storage/v1/object/{bucket}/{encoded_path}".rstrip("/")


async def upload_cv(job_id: int, filename: str, content: bytes, content_type: str) -> str:
    """Upload a CV and return its private bucket object path."""
    suffix = Path(filename).suffix.lower()
    storage_path = f"jobs/{job_id}/{uuid4().hex}{suffix}"
    headers = {
        **_storage_headers(),
        "Content-Type": content_type,
        "x-upsert": "false",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                _storage_url(storage_path), headers=headers, content=content
            )
            response.raise_for_status()
    except httpx.HTTPError as e:
        detail = e.response.text[:300] if isinstance(e, httpx.HTTPStatusError) else str(e)
        raise StorageError(f"Supabase upload failed: {detail}") from e

    return storage_path


async def delete_cvs(storage_paths: list[str]) -> None:
    """Delete CVs from Storage in one request."""
    if not storage_paths:
        return

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.request(
                "DELETE",
                _storage_url(),
                headers={**_storage_headers(), "Content-Type": "application/json"},
                json={"prefixes": storage_paths},
            )
            response.raise_for_status()
    except httpx.HTTPError as e:
        detail = e.response.text[:300] if isinstance(e, httpx.HTTPStatusError) else str(e)
        raise StorageError(f"Supabase delete failed: {detail}") from e
