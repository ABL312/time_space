// ==========================================
// 时空信箱 - Shared Type Definitions
// ==========================================

/** User profile */
export interface User {
  id: string
  name: string
  avatar_url?: string
  interest_tags: string[]
  created_at: string
}

/** Capsule location data */
export interface Location {
  lat: number
  lng: number
  name?: string
}

/** Emotion analysis result */
export interface Emotion {
  tags: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  intensity: number
  summary: string
}

/** Media attachment */
export interface Media {
  id: string
  capsule_id: string
  type: 'photo' | 'video' | 'audio'
  url: string
  thumbnail_url?: string
  sort_order: number
}

/** Time capsule */
export interface Capsule {
  id: string
  author_id: string
  author?: { name: string; avatar?: string }
  latitude: number
  longitude: number
  geohash: string
  location_name?: string
  message: string
  voice_url?: string
  voice_clone_url?: string
  emotion_tags?: string[]
  sentiment?: string
  emotion_intensity?: number
  emotion_summary?: string
  mood_tag?: string
  visibility: 'public' | 'private' | 'link_only'
  target_user_id?: string
  open_count: number
  created_at: string
  expires_at?: string
  media?: Media[]
  // Computed fields from nearby query
  distance_m?: number
  match_score?: number
  match_reasons?: string[]
}

/** Nearby query response */
export interface NearbyResponse {
  location_context?: {
    name: string
    description: string
    scene_type?: string
  }
  total: number
  recommended: Capsule[]
  others: Capsule[]
}

/** Scene recognition result */
export interface SceneResult {
  scene_type: string
  description: string
  atmosphere: string
  mood_match: string[]
}

/** Location context from AI */
export interface LocationContext {
  name: string
  description: string
  nearby_capsule_count: number
  suggested_moods: string[]
}

/** Voice clone result */
export interface VoiceCloneResult {
  voice_id: string
  audio_url: string
  duration_seconds: number
}

/** Interest tag options (8 presets) */
export const INTEREST_TAGS = [
  { key: 'campus', label: '校园回忆', emoji: '🏫' },
  { key: 'love', label: '爱情故事', emoji: '💕' },
  { key: 'family', label: '旅行记忆', emoji: '✈️' },
  { key: 'history', label: '历史文化', emoji: '🏛️' },
  { key: 'life', label: '人生感悟', emoji: '🎭' },
  { key: 'funny', label: '搞笑趣事', emoji: '😂' },
  { key: 'inspire', label: '励志鼓励', emoji: '💪' },
  { key: 'future', label: '未来信件', emoji: '🔮' },
] as const

/** Emotion tag options (16 presets) */
export const EMOTION_TAGS = [
  '怀旧', '温暖', '感恩', '浪漫', '思念', '快乐',
  '遗憾', '鼓励', '幽默', '神秘', '孤独', '希望',
  '青春', '友情', '亲情', '爱情',
] as const

/** Mood tag options (same as emotion tags, used for user selection) */
export const MOOD_TAGS = EMOTION_TAGS
