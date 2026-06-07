from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import aiosqlite
from .database import get_db

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    FastAPI dependency to get the currently authenticated user from the Bearer token.
    Raises 401 if token is missing, invalid, or expired.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is empty",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    cursor = await db.execute("SELECT * FROM users WHERE token = ?", (token,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_dict = dict(row)
    # Parse interest_tags JSON if present
    import json
    if user_dict.get("interest_tags") and isinstance(user_dict["interest_tags"], str):
        try:
            user_dict["interest_tags"] = json.loads(user_dict["interest_tags"])
        except Exception:
            user_dict["interest_tags"] = []
    return user_dict


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: aiosqlite.Connection = Depends(get_db)
) -> Optional[dict]:
    """
    Optional authentication dependency.
    Returns the user dict if a valid token is provided, otherwise returns None.
    """
    if not credentials or not credentials.credentials:
        return None
        
    token = credentials.credentials
    cursor = await db.execute("SELECT * FROM users WHERE token = ?", (token,))
    row = await cursor.fetchone()
    if not row:
        return None
        
    user_dict = dict(row)
    import json
    if user_dict.get("interest_tags") and isinstance(user_dict["interest_tags"], str):
        try:
            user_dict["interest_tags"] = json.loads(user_dict["interest_tags"])
        except Exception:
            user_dict["interest_tags"] = []
    return user_dict
