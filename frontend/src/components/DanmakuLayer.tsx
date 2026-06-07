import React, { useState, useEffect, useRef } from 'react';
import { capsulesApi } from '../lib/api';

interface DanmakuItem {
  id: string;
  capsuleId: string;
  text: string;
  emotion: string;
  top: number;
}

interface DanmakuLayerProps {
  isVisible: boolean;
}

const DanmakuLayer: React.FC<DanmakuLayerProps> = ({ isVisible }) => {
  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const capsulesRef = useRef<any[]>([]);
  const indexRef = useRef(0);
  const nextDanmakuIdRef = useRef(0);

  // Periodically fetch recent capsules to update the local pool (every 15 seconds)
  useEffect(() => {
    const fetchRecentCapsules = async () => {
      try {
        const capsules = await capsulesApi.getRecent(30);
        const validCapsules = capsules.filter(c => c.message && c.message.trim());
        if (validCapsules.length > 0) {
          capsulesRef.current = validCapsules;
        }
      } catch (error) {
        console.error('Failed to fetch recent capsules for danmaku:', error);
      }
    };

    fetchRecentCapsules();
    const fetchInterval = setInterval(fetchRecentCapsules, 15000);

    return () => clearInterval(fetchInterval);
  }, []);

  // Stream danmakus one-by-one from the pool (every 3.5 seconds)
  useEffect(() => {
    const streamDanmaku = () => {
      const pool = capsulesRef.current;
      if (pool.length === 0) return;

      // Get next capsule in pool (circular order)
      const capsule = pool[indexRef.current % pool.length];
      indexRef.current++;

      const text = capsule.message.length > 20 
        ? capsule.message.substring(0, 20) + '...' 
        : capsule.message;
      const emotion = (capsule.emotion_tags && capsule.emotion_tags[0]) || '💭';
      
      const newItem: DanmakuItem = {
        id: `dm-${Date.now()}-${nextDanmakuIdRef.current++}`,
        capsuleId: capsule.id,
        text: `${emotion} ${text}`,
        emotion: emotion,
        top: Math.random() * 60 + 15, // Keep in bounds (15% - 75% height) to avoid overlap with headers/panels
      };

      setDanmakus(prev => {
        // Prevent having the same capsule on screen simultaneously if there are other choices
        if (pool.length > 1 && prev.some(d => d.capsuleId === capsule.id)) {
          return prev;
        }
        return [...prev, newItem];
      });
    };

    const streamInterval = setInterval(streamDanmaku, 3500);
    return () => clearInterval(streamInterval);
  }, []);

  // Remove danmaku when its animation ends
  const removeDanmaku = (id: string) => {
    setDanmakus(prev => prev.filter(d => d.id !== id));
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 500 }}
    >
      {danmakus.map((danmaku) => (
        <div
          key={danmaku.id}
          onAnimationEnd={() => removeDanmaku(danmaku.id)}
          className="absolute whitespace-nowrap text-white text-sm font-medium px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/10 transition-all duration-300"
          style={{
            top: `${danmaku.top}%`,
            left: '100%',
            animation: 'danmaku-slide 10s linear forwards',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {danmaku.text}
        </div>
      ))}

      <style>
        {`
          @keyframes danmaku-slide {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(calc(-100vw - 105%));
            }
          }
        `}
      </style>
    </div>
  );
};

export default DanmakuLayer;