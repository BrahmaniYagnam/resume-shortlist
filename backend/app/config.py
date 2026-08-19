from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Resume Shortlist"
    debug: bool = False
    gpu_compute_enabled: bool = True

    database_url: str = "postgresql://postgres:postgres@localhost:5432/career_copilot"
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    upload_dir: str = "./uploads"
    chroma_persist_dir: str = "./chroma_db"

    cors_origins: str = "http://localhost:3000"

    github_client_id: str = ""
    github_client_secret: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
