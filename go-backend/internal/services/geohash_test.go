package services

import (
	"math"
	"testing"
)

func TestEncode(t *testing.T) {
	hash := Encode(31.2304, 121.4737, 6) // Shanghai
	if len(hash) != 6 {
		t.Errorf("expected hash length 6, got %d", len(hash))
	}
	// Same location should produce same hash
	hash2 := Encode(31.2304, 121.4737, 6)
	if hash != hash2 {
		t.Errorf("expected same hash for same location: %s vs %s", hash, hash2)
	}
}

func TestGetNearbyHashes(t *testing.T) {
	hashes := GetNearbyHashes(31.2304, 121.4737, 6)
	if len(hashes) != 9 {
		t.Errorf("expected 9 hashes (center + 8 neighbors), got %d", len(hashes))
	}
}

func TestHaversineDistance(t *testing.T) {
	// Same point = 0 distance
	d := HaversineDistance(31.2304, 121.4737, 31.2304, 121.4737)
	if d != 0 {
		t.Errorf("expected 0, got %f", d)
	}

	// ~1km apart should be roughly in 800-1200m range
	d = HaversineDistance(31.2304, 121.4737, 31.2350, 121.4780)
	if d < 100 || d > 2000 {
		t.Errorf("distance out of expected range: %f", d)
	}
}

func TestCalculateBoundingBox(t *testing.T) {
	minLat, maxLat, minLng, maxLng := CalculateBoundingBox(31.23, 121.47, 1000)
	if minLat >= 31.23 || maxLat <= 31.23 {
		t.Error("bounding box should contain the center point")
	}
	if minLng >= 121.47 || maxLng <= 121.47 {
		t.Error("bounding box should contain the center point")
	}
}

func TestEncodeDecodeRoundtrip(t *testing.T) {
	// Encode then decode bounds should contain the original point
	lat, lng := 31.2304, 121.4737
	hash := Encode(lat, lng, 6)
	latMin, latMax, lngMin, lngMax := decodeBounds(hash)

	if lat < latMin || lat > latMax {
		t.Errorf("lat %f not in bounds [%f, %f]", lat, latMin, latMax)
	}
	if lng < lngMin || lng > lngMax {
		t.Errorf("lng %f not in bounds [%f, %f]", lng, lngMin, lngMax)
	}
}

func TestPrecisionSelection(t *testing.T) {
	// Precision 5: ~5km cell
	h5 := Encode(31.23, 121.47, 5)
	if len(h5) != 5 {
		t.Errorf("expected length 5, got %d", len(h5))
	}

	// Precision 7: ~150m cell
	h7 := Encode(31.23, 121.47, 7)
	if len(h7) != 7 {
		t.Errorf("expected length 7, got %d", len(h7))
	}

	// Higher precision should be a prefix of lower precision
	if h7[:5] != h5 {
		t.Errorf("higher precision should share prefix with lower: %s vs %s", h7[:5], h5)
	}
}

func TestHaversineNearby(t *testing.T) {
	// Points ~50m apart
	d := HaversineDistance(31.230400, 121.473700, 31.230500, 121.473800)
	// Should be roughly 10-50 meters
	if d > 100 {
		t.Errorf("expected distance < 100m for nearby points, got %f", d)
	}
}

func TestHaversineFar(t *testing.T) {
	// Beijing to Shanghai ~1000+ km
	d := HaversineDistance(39.9042, 116.4074, 31.2304, 121.4737)
	km := d / 1000
	if km < 500 || km > 2000 {
		t.Errorf("Beijing-Shanghai distance out of range: %.0f km", km)
	}
}

func TestNeighbors(t *testing.T) {
	hash := Encode(31.23, 121.47, 6)
	neighbors := Neighbors(hash)
	if len(neighbors) != 8 {
		t.Errorf("expected 8 neighbors, got %d", len(neighbors))
	}
	// All neighbors should have same length
	for _, n := range neighbors {
		if len(n) != 6 {
			t.Errorf("neighbor length mismatch: %s", n)
		}
	}
}

func TestRecommendScore(t *testing.T) {
	score, reasons := CalculateMatchScore(
		50,                                 // distance
		[]string{"怀旧", "温暖"},             // emotion tags
		[]string{"怀旧", "校园"},             // user interest tags
		[]string{"温暖"},                    // scene moods
		15,                                 // open count
		1000,                               // max distance
	)

	if score < 0 || score > 1 {
		t.Errorf("score should be between 0 and 1, got %f", score)
	}
	if len(reasons) == 0 {
		t.Error("should have at least one reason for matching capsule")
	}

	t.Logf("Score: %f, Reasons: %v", score, reasons)
}

func TestRecommendScoreNoMatch(t *testing.T) {
	score, _ := CalculateMatchScore(
		2000,
		[]string{},
		[]string{},
		nil,
		0,
		1000,
	)

	if score > 0.5 {
		t.Errorf("score should be low for no match, got %f", score)
	}
}

func TestRankCapsules(t *testing.T) {
	capsules := []CapsuleScorable{
		{ID: "close", DistanceM: 50, EmotionTags: []string{"怀旧"}, OpenCount: 10},
		{ID: "far", DistanceM: 900, EmotionTags: []string{}, OpenCount: 0},
		{ID: "matching", DistanceM: 200, EmotionTags: []string{"温暖", "感恩"}, OpenCount: 20},
	}

	rec, others := RankCapsules(capsules, []string{"怀旧", "温暖"}, nil, 2, 1000)

	if len(rec) != 2 {
		t.Errorf("expected 2 recommended, got %d", len(rec))
	}
	if len(others) != 1 {
		t.Errorf("expected 1 other, got %d", len(others))
	}

	// "matching" or "close" should be in recommended
	inRec := make(map[string]bool)
	for _, r := range rec {
		inRec[r.ID] = true
	}
	if !inRec["close"] && !inRec["matching"] {
		t.Errorf("expected high-scoring capsules in recommended")
	}
}

func TestIntersect(t *testing.T) {
	result := intersect([]string{"a", "b", "c"}, []string{"b", "c", "d"})
	if len(result) != 2 {
		t.Errorf("expected 2 intersection, got %d", len(result))
	}
}

func TestIntersectEmpty(t *testing.T) {
	result := intersect([]string{}, []string{"a"})
	if len(result) != 0 {
		t.Errorf("expected empty intersection, got %v", result)
	}
}

// Ensure we import math (used in CalculateMatchScore)
var _ = math.Max
