import { useState, useCallback } from 'react';

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

function loadCount(key: string): number {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return parseInt(saved, 10);
  } catch { /* ignore */ }
  return 0;
}

function loadAchievements(openCount: number, createCount: number): Achievement[] {
  let list: Achievement[];
  try {
    const saved = localStorage.getItem('achievements');
    list = saved ? JSON.parse(saved) : ACHIEVEMENTS.map(ach => ({ ...ach, unlocked: false, progress: 0 }));
  } catch {
    list = ACHIEVEMENTS.map(ach => ({ ...ach, unlocked: false, progress: 0 }));
  }

  let changed = false;
  const aligned = list.map(ach => {
    let progress = ach.progress;
    if (['first-exploration', 'curious', 'story-collector', 'exploration-master'].includes(ach.id)) {
      progress = Math.min(openCount, ach.target);
    } else if (['sharer', 'prolific-creator'].includes(ach.id)) {
      progress = Math.min(createCount, ach.target);
    }

    const shouldUnlock = progress >= ach.target;
    const isUnlocked = ach.unlocked;

    if (progress !== ach.progress || (shouldUnlock && !isUnlocked)) {
      changed = true;
      return {
        ...ach,
        progress,
        unlocked: shouldUnlock ? true : ach.unlocked,
        unlockTime: shouldUnlock && !isUnlocked ? (ach.unlockTime || Date.now()) : ach.unlockTime
      };
    }
    return { ...ach, progress };
  });

  if (changed) {
    localStorage.setItem('achievements', JSON.stringify(aligned));
  }
  return aligned;
}

export const useAchievements = () => {
  const [capsuleOpenCount, setCapsuleOpenCount] = useState(() => loadCount('capsuleOpenCount'));
  const [capsuleCreateCount, setCapsuleCreateCount] = useState(() => loadCount('capsuleCreateCount'));
  
  const [achievements, setAchievements] = useState<Achievement[]>(() => 
    loadAchievements(loadCount('capsuleOpenCount'), loadCount('capsuleCreateCount'))
  );

  const updateProgress = useCallback((open: number, create: number) => {
    let prevList: Achievement[] = [];
    try {
      const saved = localStorage.getItem('achievements');
      if (saved) prevList = JSON.parse(saved);
    } catch { /* ignore */ }

    const updated = loadAchievements(open, create);
    setAchievements(updated);

    updated.forEach(ach => {
      const prevAch = prevList.find(p => p.id === ach.id);
      if (prevAch && !prevAch.unlocked && ach.unlocked) {
        window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: ach }));
      }
    });
  }, []);

  const recordCapsuleOpened = useCallback(() => {
    const newCount = loadCount('capsuleOpenCount') + 1;
    setCapsuleOpenCount(newCount);
    localStorage.setItem('capsuleOpenCount', newCount.toString());
    updateProgress(newCount, loadCount('capsuleCreateCount'));
  }, [updateProgress]);

  const recordCapsuleCreated = useCallback(() => {
    const newCount = loadCount('capsuleCreateCount') + 1;
    setCapsuleCreateCount(newCount);
    localStorage.setItem('capsuleCreateCount', newCount.toString());
    updateProgress(loadCount('capsuleOpenCount'), newCount);
  }, [updateProgress]);

  const unlockAchievement = useCallback((id: string) => {
    setAchievements(prev => {
      const updated = prev.map(ach => {
        if (ach.id === id && !ach.unlocked) {
          const unlockedAch = {
            ...ach,
            unlocked: true,
            unlockTime: Date.now(),
            progress: ach.target,
          };
          window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: unlockedAch }));
          return unlockedAch;
        }
        return ach;
      });
      localStorage.setItem('achievements', JSON.stringify(updated));
      return updated;
    });
  }, []);

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