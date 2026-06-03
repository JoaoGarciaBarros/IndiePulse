from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    secret_key: str = "dev-secret"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    storage_dir: str = "./storage"
    database_url: str = "sqlite+aiosqlite:///./storage/rage.db"

    replay_enabled: bool = True
    replay_mode: str = "websocket"  # websocket | mss
    replay_buffer_seconds: int = 35
    replay_fps: int = 10
    replay_output_fps: int = 10

    privacy_scrub_pii: bool = True
    privacy_blur_screenshots: bool = False

    discord_webhook_url: str = ""
    slack_webhook_url: str = ""
    generic_webhook_url: str = ""
    webhook_cooldown_seconds: int = 60

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def incidents_dir(self) -> str:
        return f"{self.storage_dir}/incidents"

    @property
    def is_dev(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
