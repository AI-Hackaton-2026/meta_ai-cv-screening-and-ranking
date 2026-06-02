from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Required
    anthropic_api_key: str

    # Claude model — change here or via env to experiment with different models
    claude_model: str = "claude-sonnet-4-5"

    # Concurrency cap for background CV scoring tasks
    max_concurrency: int = 5

    # Database — aiosqlite path
    database_url: str = "sqlite+aiosqlite:///./data/metahire.db"

    # CORS — comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173"

    # Supabase Storage — optional locally; required to persist original CV files remotely
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_storage_bucket: str = "cvs"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def supabase_storage_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


# Single shared instance imported everywhere
settings = Settings()  # type: ignore[call-arg]
