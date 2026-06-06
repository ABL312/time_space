package services

import (
	"math"
	"sort"
)

// CalculateMatchScore computes a 0-1 match score and reasons for a capsule.
// Weights: Distance 40%, Emotion match 30%, Scene match 20%, Popularity 10%
func CalculateMatchScore(
	distanceM float64,
	emotionTags []string,
	userInterestTags []string,
	sceneMoodMatch []string,
	openCount int,
	maxDistanceM float64,
) (float64, []string) {
	scores := make(map[string]float64)
	var reasons []string

	// 1. Distance score (40%)
	distanceScore := math.Max(0, 1-distanceM/maxDistanceM)
	scores["distance"] = distanceScore * 0.4
	if distanceM < 100 {
		reasons = append(reasons, "就在你附近")
	}

	// 2. Emotion tag match (30%)
	if len(emotionTags) > 0 && len(userInterestTags) > 0 {
		intersection := intersect(emotionTags, userInterestTags)
		emotionScore := float64(len(intersection)) / math.Max(float64(len(emotionTags)), 1)
		scores["emotion"] = emotionScore * 0.3
		if len(intersection) > 0 {
			joined := ""
			for i, t := range intersection {
				if i >= 2 {
					break
				}
				if i > 0 {
					joined += "、"
				}
				joined += t
			}
			reasons = append(reasons, "和你关注的「"+joined+"」相关")
		}
	}

	// 3. Scene match (20%)
	if len(sceneMoodMatch) > 0 && len(emotionTags) > 0 {
		sceneIntersection := intersect(sceneMoodMatch, emotionTags)
		sceneScore := float64(len(sceneIntersection)) / math.Max(float64(len(sceneMoodMatch)), 1)
		scores["scene"] = sceneScore * 0.2
		if len(sceneIntersection) > 0 {
			reasons = append(reasons, "和当前场景氛围匹配")
		}
	}

	// 4. Popularity (10%)
	popularityScore := math.Min(float64(openCount)/50.0, 1.0)
	scores["popularity"] = popularityScore * 0.1
	if openCount >= 10 {
		reasons = append(reasons, "热门")
	}

	total := 0.0
	for _, v := range scores {
		total += v
	}
	return math.Round(total*1000) / 1000, reasons
}

// RankCapsules scores and sorts capsules, splitting into recommended + others
func RankCapsules(
	capsules []CapsuleScorable,
	userInterestTags []string,
	sceneMoodMatch []string,
	topN int,
	maxDistanceM float64,
) (recommended []CapsuleScorable, others []CapsuleScorable) {
	for i := range capsules {
		score, reasons := CalculateMatchScore(
			capsules[i].DistanceM,
			capsules[i].EmotionTags,
			userInterestTags,
			sceneMoodMatch,
			capsules[i].OpenCount,
			maxDistanceM,
		)
		capsules[i].MatchScore = &score
		capsules[i].MatchReasons = reasons
	}

	// Sort by match score descending
	sort.Slice(capsules, func(i, j int) bool {
		si := 0.0
		if capsules[i].MatchScore != nil {
			si = *capsules[i].MatchScore
		}
		sj := 0.0
		if capsules[j].MatchScore != nil {
			sj = *capsules[j].MatchScore
		}
		return si > sj
	})

	if topN > len(capsules) {
		topN = len(capsules)
	}

	return capsules[:topN], capsules[topN:]
}

// CapsuleScorable is the interface used by the ranking engine
type CapsuleScorable struct {
	ID           string
	DistanceM    float64
	EmotionTags  []string
	OpenCount    int
	MatchScore   *float64
	MatchReasons []string
}

func intersect(a, b []string) []string {
	set := make(map[string]bool, len(a))
	for _, s := range a {
		set[s] = true
	}
	var result []string
	for _, s := range b {
		if set[s] {
			result = append(result, s)
		}
	}
	return result
}
