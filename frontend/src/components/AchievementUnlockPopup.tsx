import { useEffect, useState } from 'react'
import type { Achievement } from '../hooks/useAchievements'
import { Card, Button } from './ui'

interface AchievementUnlockPopupProps {
  achievement: Achievement | null
  onClose: () => void
}

export default function AchievementUnlockPopup({ achievement, onClose }: AchievementUnlockPopupProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    if (achievement) {
      setShouldRender(true)
      // Allow DOM mount before starting CSS transitions
      const t1 = setTimeout(() => setAnimateIn(true), 50)
      return () => clearTimeout(t1)
    } else {
      setAnimateIn(false)
      const t2 = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(t2)
    }
  }, [achievement])

  if (!shouldRender || !achievement) return null

  // nostalgic flavor text tailored to each achievement ID
  const getNostalgicQuote = (id: string) => {
    switch (id) {
      case 'first-exploration':
        return '“踏出第一步的瞬间，好奇心已化作岁月的信标。”';
      case 'curious':
        return '“你倾听的每一声叹息，都是时光在心间泛起的涟漪。”';
      case 'story-collector':
        return '“当行囊装满了他人的温存，你的旅途也便有了回声。”';
      case 'exploration-master':
        return '“千百次涉足，你已是这片土地情感长河的见证人。”';
      case 'sharer':
        return '“在浩瀚的时空里刻下你的印记，等未来的来客温柔开启。”';
      case 'prolific-creator':
        return '“你留下的故事，是荒芜岁月里最温暖的灯火阑珊。”';
      default:
        return '“岁月的印记，镌刻在永恒的探索之中。”';
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
        animateIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`w-full max-w-sm px-6 transition-all duration-500 ease-[var(--ease-spring)] ${
          animateIn ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'
        }`}
      >
        <Card
          padding="lg"
          className="relative bg-bg border-2 border-primary/30 shadow-2xl rounded-xl text-center overflow-hidden flex flex-col items-center py-8"
        >
          {/* Postcard stamp overlay borders */}
          <div className="absolute inset-2 border border-dashed border-primary/20 pointer-events-none rounded-lg" />
          
          {/* Gold seal / stamp circle */}
          <div className="relative w-28 h-28 rounded-full bg-amber-500/10 border-4 border-double border-amber-600/30 flex items-center justify-center shadow-inner mb-6 animate-pulse">
            <span className="text-5xl animate-[bounce_2s_infinite]">{achievement.icon}</span>
            {/* Stamp teeth decoration */}
            <div className="absolute inset-0 rounded-full border border-dashed border-amber-600/40 animate-[spin_40s_linear_infinite]" />
          </div>

          <span className="text-[10px] tracking-widest font-serif font-bold text-primary uppercase bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3 shadow-xs">
            🏆 荣耀勋章解锁
          </span>

          <h3 className="text-2xl font-bold font-serif text-text-primary mb-2 tracking-wide">
            {achievement.title}
          </h3>

          <p className="text-sm text-text-secondary font-serif mb-6 leading-relaxed max-w-xs">
            {achievement.description}
          </p>

          <p className="text-xs italic text-primary/80 font-serif leading-relaxed mb-8 px-4 border-t border-b border-primary/10 py-3 bg-primary/2">
            {getNostalgicQuote(achievement.id)}
          </p>

          <Button
            variant="primary"
            size="md"
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary-dark border border-primary/20 text-white font-serif font-bold py-3.5 tracking-widest rounded-md shadow-md active:scale-98 transition-transform cursor-pointer"
          >
            轻戳收下勋章
          </Button>
        </Card>
      </div>
    </div>
  )
}
