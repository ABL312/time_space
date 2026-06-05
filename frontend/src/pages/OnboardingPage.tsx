import { useState, useEffect } from 'react'
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
  const [isNameValid, setIsNameValid] = useState(true)

  // Validate name on change
  useEffect(() => {
    const trimmedName = name.trim()
    const isValid = trimmedName.length >= 1 && trimmedName.length <= 20
    setIsNameValid(isValid)
  }, [name])

  const toggleTag = (label: string) => {
    setSelectedTags((prev) =>
      prev.includes(label)
        ? prev.filter((t) => t !== label)
        : prev.length < 3
          ? [...prev, label]
          : prev
    )
  }

  const canSubmit = isNameValid && name.trim().length > 0 && selectedTags.length === 3

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
      localStorage.setItem('time_space_user_id', user.id)
      navigate('/')
    } catch (err: any) {
      setError(err.message || '注册失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) {
      handleSubmit()
    }
  }

  return (
    <div 
      className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12"
      onKeyDown={handleKeyPress}
    >
      {/* Slide-up card */}
      <div className="onboarding-card w-full max-w-sm glass rounded-3xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 envelope-icon-appear">✉️</div>
          <h1 className="text-2xl font-bold text-white mb-2">欢迎来到时空信箱</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            在物理空间留下情感信息，后来者到达此地时发现它
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Name input */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">你的昵称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入1-20个字符"
              maxLength={20}
              className={`w-full px-4 py-3 rounded-xl bg-surface/80 border ${
                isNameValid ? 'border-slate-600' : 'border-red-500'
              } text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all`}
            />
            <div className="flex justify-between items-center mt-1">
              <p className={`text-xs ${isNameValid ? 'text-slate-500' : 'text-red-400'}`}>
                {isNameValid ? '' : '昵称需为1-20个字符'}
              </p>
              <p className="text-xs text-slate-500">{name.length}/20</p>
            </div>
          </div>

          {/* Interest tags */}
          <div>
            <label className="block text-sm text-slate-300 mb-3">
              选择你最感兴趣的胶囊类型
              <span className={`ml-2 font-medium ${selectedTags.length === 3 ? 'text-primary-light' : 'text-slate-500'}`}>
                已选 {selectedTags.length}/3
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INTEREST_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.label)
                return (
                  <button
                    key={tag.key}
                    onClick={() => toggleTag(tag.label)}
                    disabled={selectedTags.length >= 3 && !isSelected}
                    className={`
                      p-3 rounded-xl text-sm text-left transition-all duration-200
                      ${isSelected
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                        : selectedTags.length >= 3
                          ? 'bg-surface/50 text-slate-500 border border-slate-700 cursor-not-allowed'
                          : 'bg-surface text-slate-400 border border-slate-600 hover:border-slate-400 hover:text-slate-200 cursor-pointer'
                      }
                    `}
                  >
                    <span className="text-lg mr-1">{tag.emoji}</span>
                    {tag.label}
                  </button>
                )
              })}
            </div>
            {selectedTags.length !== 3 && (
              <p className="text-xs text-red-400 mt-2">
                {selectedTags.length > 0 
                  ? `还需选择${3 - selectedTags.length}个标签` 
                  : '请选择3个标签'}
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
              <p className="text-xs text-red-400 text-center">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className={`
              w-full py-3.5 rounded-xl text-sm font-medium transition-all duration-200
              ${canSubmit && !isSubmitting
                ? 'bg-primary hover:bg-primary-light text-white shadow-lg shadow-primary/30 active:scale-[0.98]'
                : 'bg-primary text-white opacity-50 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                创建中...
              </span>
            ) : (
              '开始探索时空 ✨'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}