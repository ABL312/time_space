import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'
import { usersApi, getErrorMessage } from '../lib/api'
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, '注册失败，请重试'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12 page-in relative overflow-hidden">
      {/* Background elegant watercolor blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-signal/5 blur-3xl" />

      {/* Header */}
      <div className="text-center mb-10 z-10">
        <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 rounded-full shadow-sm text-2xl">
          ✉️
        </div>
        <h1 className="text-3xl font-bold font-serif text-text-primary mb-2 tracking-wide">时空信箱</h1>
        <p className="text-sm text-text-secondary max-w-xs mx-auto leading-relaxed font-serif">
          在特定的物理空间留下你的心声<br />当后来者踏足此地，便能开启这封岁月的来信
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm space-y-6 z-10 bg-surface-elevated/60 backdrop-blur-sm p-8 rounded-lg border border-border shadow-sm">
        {/* Name input */}
        <div>
          <label className="text-xs uppercase tracking-wider text-primary font-bold block mb-2 font-serif">你的称呼</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入你的昵称 (例: 毕业生小林)"
            maxLength={20}
            className="w-full px-4 py-3 bg-bg border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-serif"
          />
          <p className="text-xs text-text-muted mt-1 text-right">{name.length}/20</p>
        </div>

        {/* Interest tags */}
        <div>
          <label className="text-xs uppercase tracking-wider text-primary font-bold flex items-center justify-between mb-2 font-serif">
            <span>选择 3 个兴趣标签</span>
            <span className={selectedTags.length === 3 ? 'text-primary' : 'text-text-muted'}>{selectedTags.length}/3</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INTEREST_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.label)
              return (
                <button
                  key={tag.key}
                  onClick={() => toggleTag(tag.label)}
                  className={`p-3 text-sm text-left transition-all border rounded-md font-serif flex items-center ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border bg-bg text-text-secondary hover:border-primary/50'
                  }`}
                >
                  <span className="text-base mr-2">{tag.emoji}</span>
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-xs text-data-bad text-center font-serif">{error}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`w-full py-3.5 text-sm font-serif font-bold tracking-wider transition-all border rounded-md ${
            canSubmit && !isSubmitting
              ? 'border-primary bg-primary text-white hover:bg-primary-dark shadow-sm'
              : 'border-border bg-surface text-text-muted cursor-not-allowed'
          }`}
        >
          {isSubmitting ? '连接时空信箱中...' : '开启时空之旅'}
        </button>
      </div>
    </div>
  )
}
