"""
统一配置中心 — 后端重构 03 (#37)

所有环境变量和配置项在此集中管理。
无 AI key 时主流程不失败，各服务有独立 fallback。

Usage:
    from .config import config
    print(config.upload_dir)
"""
import os
from pathlib import Path
from functools import lru_cache


class Config:
    """Application configuration loaded from environment variables."""

    def __init__(self):
        # ── Database ────────────────────────────────────────────
        self.database_url = os.getenv(
            "DATABASE_URL",
            f"sqlite:///{Path(__file__).parent.parent / 'data' / 'timespace.db'}",
        )

        # ── Server ──────────────────────────────────────────────
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = int(os.getenv("PORT", "8000"))
        self.environment = os.getenv("ENVIRONMENT", "production")
        self.is_development = self.environment.lower() in ("development", "dev", "local")

        # ── CORS ─────────────────────────────────────────────────
        self.cors_origins = os.getenv(
            "CORS_ORIGINS", "http://localhost:5173"
        ).split(",")

        # ── Upload ───────────────────────────────────────────────
        _default_upload = os.getenv("UPLOAD_DIR", "./data/uploads")
        if _default_upload.startswith("./") or _default_upload.startswith(".\\"):
            # Relative to backend/ directory (not cwd-dependent)
            self.upload_dir = (Path(__file__).parent.parent / _default_upload[2:]).resolve()
        else:
            self.upload_dir = Path(_default_upload).resolve()
        self.max_photo_size_mb = int(os.getenv("MAX_PHOTO_SIZE_MB", "5"))
        self.max_voice_size_mb = int(os.getenv("MAX_VOICE_SIZE_MB", "10"))

        # ── AI API Keys (optional — services have fallbacks) ────
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY", "")

        # ── AI Service Flags ─────────────────────────────────────
        self.ai_emotion_enabled = bool(self.openai_api_key)
        self.ai_scene_enabled = bool(self.openai_api_key)
        self.ai_location_enabled = True  # Nominatim is free, no key needed
        self.ai_voice_enabled = bool(self.elevenlabs_api_key)

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def has_elevenlabs(self) -> bool:
        return bool(self.elevenlabs_api_key)

    def summary(self) -> dict:
        """Return a safe summary for health checks (no secrets)."""
        return {
            "environment": self.environment,
            "database_url": self.database_url.split(":///")[0] + ":///***",
            "upload_dir": str(self.upload_dir),
            "cors_origins": self.cors_origins,
            "ai_emotion_enabled": self.ai_emotion_enabled,
            "ai_scene_enabled": self.ai_scene_enabled,
            "ai_voice_enabled": self.ai_voice_enabled,
        }


@lru_cache()
def get_config() -> Config:
    """Return the singleton Config instance."""
    return Config()


# Module-level singleton for easy import
config = get_config()
