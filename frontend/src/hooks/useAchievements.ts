import { useState, useEffect } from 'react';

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

export const useAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [capsuleOpenCount, setCapsuleOpenCount] = useState(0);
  const [capsuleCreateCount, setCapsuleCreateCount] = useState(0);

  // 初始化成就数据
  useEffect(() => {
    const savedAchievements = localStorage.getItem('achievements');
    const savedOpenCount = localStorage.getItem('capsuleOpenCount');
    const savedCreateCount = localStorage.getItem('capsuleCreateCount');

    if (savedAchievements) {
      setAchievements(JSON.parse(savedAchievements));
    } else {
      // 初始化成就
      const initialAchievements = ACHIEVEMENTS.map(ach => ({
        ...ach,
        unlocked: false,
        progress: 0,
      }));
      setAchievements(initialAchievements);
      localStorage.setItem('achievements', JSON.stringify(initialAchievements));
    }

    if (savedOpenCount) {
      setCapsuleOpenCount(parseInt(savedOpenCount, 10));
    }

    if (savedCreateCount) {
      setCapsuleCreateCount(parseInt(savedCreateCount, 10));
    }
  }, []);

  // 更新成就状态
  useEffect(() => {
    const updatedAchievements = achievements.map(achievement => {
      let progress = achievement.progress;
      let unlocked = achievement.unlocked;

      if (achievement.id.includes('exploration') || achievement.id.includes('curious')) {
        progress = Math.min(capsuleOpenCount, achievement.target);
      } else if (achievement.id.includes('sharer') || achievement.id.includes('creator')) {
        progress = Math.min(capsuleCreateCount, achievement.target);
      }

      if (progress >= achievement.target && !unlocked) {
        unlocked = true;
        return {
          ...achievement,
          progress,
          unlocked,
          unlockTime: Date.now(),
        };
      }

      return {
        ...achievement,
        progress,
      };
    });

    // 检查是否有更新
    const hasChanges = JSON.stringify(updatedAchievements) !== JSON.stringify(achievements);
    if (hasChanges) {
      setAchievements(updatedAchievements);
      localStorage.setItem('achievements', JSON.stringify(updatedAchievements));
    }
  }, [capsuleOpenCount, capsuleCreateCount, achievements]);

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