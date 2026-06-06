package services

import (
	"math"
	"strings"
)

// Base32 character set for geohash
const base32Chars = "0123456789bcdefghjkmnpqrstuvwxyz"

// Encode encodes latitude/longitude to a geohash string of given precision
func Encode(lat, lng float64, precision int) string {
	if precision < 1 {
		precision = 6
	}

	latMin, latMax := -90.0, 90.0
	lngMin, lngMax := -180.0, 180.0

	var result strings.Builder
	result.Grow(precision)

	even := true
	bit := 0
	ch := 0

	for result.Len() < precision {
		if even {
			mid := (lngMin + lngMax) / 2
			if lng > mid {
				ch |= 1 << (4 - bit)
				lngMin = mid
			} else {
				lngMax = mid
			}
		} else {
			mid := (latMin + latMax) / 2
			if lat > mid {
				ch |= 1 << (4 - bit)
				latMin = mid
			} else {
				latMax = mid
			}
		}

		even = !even
		if bit < 4 {
			bit++
		} else {
			result.WriteByte(base32Chars[ch])
			bit = 0
			ch = 0
		}
	}

	return result.String()
}

// Neighbors returns the 8 adjacent geohash cells for a given hash
func Neighbors(hash string) []string {
	// Decode the hash to get bounds
	latMin, latMax, lngMin, lngMax := decodeBounds(hash)
	latMid := (latMin + latMax) / 2
	lngMid := (lngMin + lngMax) / 2
	latDelta := latMax - latMin
	lngDelta := lngMax - lngMin

	precision := len(hash)

	return []string{
		Encode(latMid+latDelta, lngMid-lngDelta, precision), // north-west
		Encode(latMid+latDelta, lngMid, precision),          // north
		Encode(latMid+latDelta, lngMid+lngDelta, precision), // north-east
		Encode(latMid, lngMid-lngDelta, precision),          // west
		Encode(latMid, lngMid+lngDelta, precision),          // east
		Encode(latMid-latDelta, lngMid-lngDelta, precision), // south-west
		Encode(latMid-latDelta, lngMid, precision),          // south
		Encode(latMid-latDelta, lngMid+lngDelta, precision), // south-east
	}
}

// GetNearbyHashes returns center hash + 8 neighbors (9 total)
func GetNearbyHashes(lat, lng float64, precision int) []string {
	center := Encode(lat, lng, precision)
	return append([]string{center}, Neighbors(center)...)
}

// decodeBounds decodes a geohash to lat/lng bounds
func decodeBounds(hash string) (latMin, latMax, lngMin, lngMax float64) {
	latMin, latMax = -90.0, 90.0
	lngMin, lngMax = -180.0, 180.0
	even := true

	for i := 0; i < len(hash); i++ {
		idx := strings.IndexByte(base32Chars, hash[i])
		if idx < 0 {
			continue
		}
		for bit := 4; bit >= 0; bit-- {
			val := (idx >> bit) & 1
			if even {
				mid := (lngMin + lngMax) / 2
				if val == 1 {
					lngMin = mid
				} else {
					lngMax = mid
				}
			} else {
				mid := (latMin + latMax) / 2
				if val == 1 {
					latMin = mid
				} else {
					latMax = mid
				}
			}
			even = !even
		}
	}
	return
}

// HaversineDistance calculates distance in meters between two GPS points
func HaversineDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371000 // Earth radius in meters

	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*
			math.Sin(dLng/2)*math.Sin(dLng/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// CalculateBoundingBox returns (minLat, maxLat, minLng, maxLng) for a radius filter
func CalculateBoundingBox(lat, lng, radiusM float64) (float64, float64, float64, float64) {
	latDegreePerMeter := 1.0 / 111320.0
	lngDegreePerMeter := 1.0 / (111320.0 * math.Cos(toRad(lat)))

	latDelta := radiusM * latDegreePerMeter
	lngDelta := radiusM * lngDegreePerMeter

	return lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta
}

func toRad(deg float64) float64 {
	return deg * math.Pi / 180
}
