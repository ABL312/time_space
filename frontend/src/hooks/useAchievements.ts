import { useState, useEffect, useMemo, useRef } from 'react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockTime?: number;
  progress: number;
  target: number;
}

const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockTime' | 'progress'>[] = [
  {
    id: 'first-exploration',
    title: '初次探索',
    description: '打开第1个胶囊',
    icon: '🔍',
    target: 1,
  },
  {
    id: 'curious',
    title: '好奇者',
    description: '打开5个胶囊',
    icon: '📖',
    target: 5,
  },
  {
    id: 'story-collector',
    title: '故事收集者',
    description: '打开20个胶囊',
    icon: '📚',
    target: 20,
  },
  {
    id: 'exploration-master',
    title: '探索达人',
    description: '打开50个胶囊',
    icon: '🏆',
    target: 50,
  },
  {
    id: 'sharer',
    title: '分享者',
    description: '创建第1个胶囊',
    icon: '✏️',
    target: 1,
  },
  {
    id: 'prolific-creator',
    title: '多产创作者',
    description: '创建10个胶囊',
    icon: '🖋️',
    target: 10,
  },
];

function loadAchievements(): Achievement[] {
  try {
    const saved = localStorage.getItem('achievements');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return ACHIEVEMENTS.map(ach => ({ ...ach, unlocked: false, progress: 0 }));
}

function loadCount(key: string): number {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return parseInt(saved, 10);
  } catch { /* ignore */ }
  return 0;
}

export const useAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>(loadAchievements);
  const [capsuleOpenCount, setCapsuleOpenCount] = useState(() => loadCount('capsuleOpenCount'));
  const [capsuleCreateCount, setCapsuleCreateCount] = useState(() => loadCount('capsuleCreateCount'));
  const prevAchievementsRef = useRef(achievements);

  // 计算派生成就状态
  const computedAchievements = useMemo(() => {
    return achievements.map(achievement => {
      let progress = achievement.progress;

      if (achievement.id.includes('exploration') || achievement.id.includes('curious')) {
        progress = Math.min(capsuleOpenCount, achievement.target);
      } else if (achievement.id.includes('sharer') || achievement.id.includes('creator')) {
        progress = Math.min(capsuleCreateCount, achievement.target);
      }

      if (progress >= achievement.target && !achievement.unlocked) {
        return { ...achievement, progress, unlocked: true, unlockTime: achievement.unlockTime ?? 0 };
      }

      return { ...achievement, progress };
    });
  }, [achievements, capsuleOpenCount, capsuleCreateCount]);

  // 持久化成就变化
  useEffect(() => {
    // 深比较：检查是否真的有变化
    const prev = prevAchievementsRef.current;
    const hasChanges = JSON.stringify(prev) !== JSON.stringify(computedAchievements);
    
    if (hasChanges) {
      // Stamp real unlock timestamps for newly unlocked achievements
      const stamped = computedAchievements.map(a =>
        a.unlocked && a.unlockTime === 0 ? { ...a, unlockTime: Date.now() } : a
      );
      prevAchievementsRef.current = stamped;
      localStorage.setItem('achievements', JSON.stringify(stamped));
      // 注意：不再调用 setAchievements，避免无限循环
    }
  }, [computedAchievements]);

  // 记录打开胶囊
  const recordCapsuleOpened = () => {
    const newCount = capsuleOpenCount + 1;
    setCapsuleOpenCount(newCount);
    localStorage.setItem('capsuleOpenCount', newCount.toString());
  };

  // 记录创建胶囊
  const recordCapsuleCreated = () => {
    const newCount = capsuleCreateCount + 1;
    setCapsuleCreateCount(newCount);
    localStorage.setItem('capsuleCreateCount', newCount.toString());
  };

  // 手动解锁成就（用于测试）
  const unlockAchievement = (id: string) => {
    const updatedAchievements = achievements.map(achievement => {
      if (achievement.id === id && !achievement.unlocked) {
        return {
          ...achievement,
          unlocked: true,
          unlockTime: Date.now(),
          progress: achievement.target,
        };
      }
      return achievement;
    });

    setAchievements(updatedAchievements);
    localStorage.setItem('achievements', JSON.stringify(updatedAchievements));
  };

  return {
    achievements,
    recordCapsuleOpened,
    recordCapsuleCreated,
    unlockAchievement,
    capsuleOpenCount,
    capsuleCreateCount,
  };
};

export default useAchievements;