from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-5"
    max_concurrency: int = 5
    database_url: str = "sqlite+aiosqlite:///./data/metahire.db"

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    cors_origins: str = "http://localhost:5173"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_storage_bucket: str = "cvs"
    mailjet_api_key: str | None = None
    mailjet_secret_key: str | None = None
    email_from: str | None = None
    email_from_name: str = "MetaHire"
    email_reply_to: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def supabase_storage_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


settings = Settings()  # type: ignore[call-arg]
