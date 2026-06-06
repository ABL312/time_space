"""
Base repository with shared helper methods.
"""
import json
from typing import Optional


def parse_json_field(value: Optional[str], default=None):
    """Safely parse a JSON text field. Returns default on failure."""
    if value is None:
        return default
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default


def row_to_dict(row) -> dict:
    """Convert an aiosqlite.Row to a plain dict."""
    return dict(row)


async def batch_fetch_media(db, capsule_ids: list[str]) -> dict[str, list[dict]]:
    """Fetch media for multiple capsule IDs in a single query.
    
    Returns: {capsule_id: [media_dict, ...]}
    """
    if not capsule_ids:
        return {}
    placeholders = ",".join(["?" for _ in capsule_ids])
    cursor = await db.execute(
        f"SELECT * FROM media WHERE capsule_id IN ({placeholders}) ORDER BY sort_order",
        capsule_ids,
    )
    rows = await cursor.fetchall()
    result: dict[str, list[dict]] = {cid: [] for cid in capsule_ids}
    for row in rows:
        m = dict(row)
        result[m["capsule_id"]].append(m)
    return result
