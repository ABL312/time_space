"""
Pytest configuration — shared fixtures and test setup.
"""
import sys
from pathlib import Path

# Ensure backend/ is on sys.path so tests can import from app/
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from app.database import init_db


@pytest.fixture(scope="session", autouse=True)
def _init_db():
    """Initialize database once per test session."""
    import asyncio
    asyncio.run(init_db())


@pytest.fixture
def client():
    """Return a FastAPI TestClient."""
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)

