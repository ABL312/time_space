import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { usersApi } from '../lib/api'
import { INTEREST_TAGS } from '../types'
import Starfield from '../components/Starfield'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { setUser } = useUserStore()

  const [name, setName] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTag = (label: string) => {
    setSelectedTags((prev) =>
      prev.includes(label)
        ? prev.filter((t) => t !== label)
        : prev.length < 3
          ? [...prev, label]
          : prev
    )
  }

  const canSubmit = name.trim().length > 0 && name.length <= 20 && selectedTags.length === 3

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    setError(null)

    try {
      const user = await usersApi.create({
        name: name.trim(),
        interest_tags: selectedTags,
      })
      setUser(user)
      navigate('/')
    } catch (err: any) {
      setError(err.message || '注册失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen starfield flex flex-col items-center justify-center px-6 py-12 page-in">
      <Starfield count={120} shooting />
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-3 h-3 bg-capsule mx-auto mb-5" style={{ boxShadow: '0 0 20px 6px rgba(245,166,35,0.3)' }} />
        <h1 className="text-xl font-semibold text-white mb-2 tracking-wide">时空信箱</h1>
        <p className="data max-w-xs mx-auto leading-relaxed">
          在物理空间留下情感信息<br />后来者到达此地时发现它
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm space-y-6">
        {/* Name input */}
        <div>
          <label className="label mb-2 block">IDENTIFIER</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入你的昵称"
            maxLength={20}
            className="w-full px-4 py-3 bg-surface border border-border text-white placeholder-slate-600 focus:outline-none focus:border-signal transition-colors text-sm font-mono"
          />
          <p className="data mt-1 text-right">{name.length}/20</p>
        </div>

        {/* Interest tags */}
        <div>
          <label className="label mb-2 flex items-center justify-between">
            <span>INTEREST_PROFILE</span>
            <span className={selectedTags.length === 3 ? 'text-signal' : ''}>{selectedTags.length}/3</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {INTEREST_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.label)
              return (
                <button
                  key={tag.key}
                  onClick={() => toggleTag(tag.label)}
                  className={`btn p-3 text-sm text-left transition-all border ${
                    isSelected
                      ? 'border-signal/40 bg-signal/5 text-white'
                      : 'border-border bg-surface/50 text-slate-400 hover:border-surface-light'
                  }`}
                >
                  <span className="text-base mr-1.5">{tag.emoji}</span>
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && <p className="data text-data-bad text-center">{error}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`btn w-full py-3.5 text-xs font-mono tracking-widest transition-all border ${
            canSubmit && !isSubmitting
              ? 'border-capsule/40 bg-capsule/5 text-capsule hover:bg-capsule/10'
              : 'border-border bg-surface/50 text-slate-600 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'INITIALIZING...' : 'BEGIN EXPLORATION'}
        </button>
      </div>
    </div>
  )
}
