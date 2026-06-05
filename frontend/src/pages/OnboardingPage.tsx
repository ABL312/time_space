import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { usersApi } from '../lib/api'
import { INTEREST_TAGS } from '../types'

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
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">✉️</div>
        <h1 className="text-2xl font-bold text-white mb-2">欢迎来到时空信箱</h1>
        <p className="text-sm text-slate-400">
          在物理空间留下情感信息，后来者到达此地时发现它
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm space-y-6">
        {/* Name input */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">你的昵称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="最多20个字符"
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
          <p className="text-xs text-slate-500 mt-1 text-right">{name.length}/20</p>
        </div>

        {/* Interest tags */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">
            选择你最感兴趣的胶囊类型
            <span className="text-primary-light ml-1">
              ({selectedTags.length}/3)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INTEREST_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.label)
              return (
                <button
                  key={tag.key}
                  onClick={() => toggleTag(tag.label)}
                  className={`
                    p-3 rounded-xl text-sm text-left transition-all
                    ${isSelected
                      ? 'bg-primary/20 border-2 border-primary text-white'
                      : 'bg-surface border-2 border-transparent text-slate-300 hover:border-slate-500'
                    }
                  `}
                >
                  <span className="text-lg mr-1">{tag.emoji}</span>
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`
            w-full py-3 rounded-xl text-sm font-medium transition-all
            ${canSubmit && !isSubmitting
              ? 'bg-primary hover:bg-primary-light text-white'
              : 'bg-surface text-slate-500 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? '创建中...' : '开始探索时空 ✨'}
        </button>
      </div>
    </div>
  )
}
