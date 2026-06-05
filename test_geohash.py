import geohash
from backend.app.services.geohash_service import encode, get_nearby_hashes, find_nearby_capsules

# Test coordinates
lat, lng = 31.0282, 121.4346

print("=== Geohash Precision Test ===")
print(f"Coordinates: {lat}, {lng}")

# Test different precisions
for precision in [5, 6, 7]:
    hash_val = encode(lat, lng, precision)
    print(f"Precision {precision}: {hash_val}")
    
    # Get neighbors
    neighbors = geohash.neighbors(hash_val)
    print(f"  Neighbors: {neighbors}")
    print(f"  Total cells (center + neighbors): {len(neighbors) + 1}")
    print()

# Test nearby hashes function
print("=== Nearby Hashes Test ===")
nearby_hashes = get_nearby_hashes(lat, lng, 6)
print(f"Nearby hashes (precision 6): {nearby_hashes}")