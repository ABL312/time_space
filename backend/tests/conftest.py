"""
Pytest configuration — shared fixtures and test setup.
"""
import sys
import asyncio
from pathlib import Path

# Ensure backend/ is on sys.path so tests can import from app/
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from app.database import init_db


@pytest.fixture(scope="session", autouse=True)
def _init_db():
    """Initialize database once per test session."""
    asyncio.run(init_db())


@pytest.fixture
def client():
    """Return a FastAPI TestClient."""
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)


@pytest.fixture(autouse=True)
def _await_pending_tasks():
    """After each test, let pending async cleanup finish to avoid
    aiosqlite 'Event loop is closed' warnings."""
    yield
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return
        # Drain any remaining tasks
        pending = asyncio.all_tasks(loop)
        if pending:
            loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
    except (RuntimeError, Exception):
        pass

