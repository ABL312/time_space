"""
Geohash-based nearby capsule query service.
Uses 6-character geohash (~1.2km precision) + 8 neighbors for area search.
"""
try:
    import geohash
except ImportError:
    import pygeohash as geohash
import math
from typing import Optional


def encode(lat: float, lng: float, precision: int = 6) -> str:
    """Encode lat/lng to geohash string."""
    return geohash.encode(lat, lng, precision)


def get_nearby_hashes(lat: float, lng: float, precision: int = 6) -> list[str]:
    """Get the center geohash + 8 neighbors (9 total cells)."""
    center = encode(lat, lng, precision)
    neighbors = geohash.neighbors(center)
    return [center] + list(neighbors)


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two GPS points in meters."""
    R = 6371000  # Earth radius in meters
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_bounding_box(lat: float, lng: float, radius_m: float) -> tuple:
    """Calculate bounding box for initial filtering in search."""
    # Approximate degrees per meter
    lat_degree_per_meter = 1 / 111320
    lng_degree_per_meter = 1 / (111320 * math.cos(math.radians(lat)))
    
    # Calculate bounds
    lat_delta = radius_m * lat_degree_per_meter
    lng_delta = radius_m * lng_degree_per_meter
    
    min_lat = lat - lat_delta
    max_lat = lat + lat_delta
    min_lng = lng - lng_delta
    max_lng = lng + lng_delta
    
    return min_lat, max_lat, min_lng, max_lng


async def find_nearby_capsules(
    db,
    lat: float,
    lng: float,
    radius_m: float = 1200,
    visibility: str = "public",
    limit: int = 50,
    additional_where: str = "",
    additional_params: tuple = (),
) -> list[dict]:
    """
    Find capsules near a GPS point using geohash pre-filter + haversine sort.
    
    Returns list of capsule dicts with 'distance_m' field added.
    """
    # Choose geohash precision based on radius
    # 5 chars: ~5km, 6 chars: ~1.2km, 7 chars: ~150m
    if radius_m <= 200:
        precision = 7
    elif radius_m <= 2000:
        precision = 6
    else:
        precision = 5

    hashes = get_nearby_hashes(lat, lng, precision)
    placeholders = ",".join(["?" for _ in hashes])

    # Use SUBSTR to match stored geohash at the query precision
    # (stored hashes are always precision 6, but we may query at lower precision)
    query = f"""
        SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
        FROM capsules c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE SUBSTR(c.geohash, 1, {precision}) IN ({placeholders})
        AND c.visibility = ?
        {additional_where}
        ORDER BY c.created_at DESC
        LIMIT ?
    """

    params = hashes + [visibility] + list(additional_params) + [limit]
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    # Calculate exact haversine distance and filter by radius
    results = []
    for row in rows:
        capsule = dict(row)
        dist = haversine_distance(lat, lng, capsule["latitude"], capsule["longitude"])
        if dist <= radius_m:
            capsule["distance_m"] = round(dist, 1)
            results.append(capsule)

    # Sort by distance
    results.sort(key=lambda x: x["distance_m"])
    return results