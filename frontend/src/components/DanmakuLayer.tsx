import React, { useState, useEffect, useRef } from 'react';
import type { Capsule } from '../types';

interface DanmakuItem {
  id: string;
  text: string;
  emotion: string;
  top: number;
}

const DanmakuLayer: React.FC = () => {
  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const danmakuIdRef = useRef(0);

  // Fetch recent capsules
  useEffect(() => {
    let intervalId: any;

    const fetchRecentCapsules = async () => {
      try {
        const response = await fetch('/api/capsules/recent?limit=20');
        if (response.ok) {
          const data = await response.json();
          const capsules: Capsule[] = data.capsules || data;
          
          // Create new danmaku items
          const newDanmakus = capsules
            .filter(capsule => capsule.message)
            .map(capsule => {
              // Get first 20 characters of message
              const text = capsule.message!.length > 20 
                ? capsule.message!.substring(0, 20) + '...' 
                : capsule.message!;
              
              // Get emotion tag
              const emotion = (capsule.emotion_tags && capsule.emotion_tags[0]) || '💭';
              
              return {
                id: `dm-${Date.now()}-${danmakuIdRef.current++}`,
                text: `${emotion} ${text}`,
                emotion: (capsule.emotion_tags && capsule.emotion_tags[0]) || '',
                top: Math.random() * 80 + 10, // Random position between 10% and 90%
              };
            });
          
          // Add new danmakus to state
          if (newDanmakus.length > 0) {
            setDanmakus(prev => {
              // Keep only recent danmakus (last 30)
              const updated = [...prev, ...newDanmakus];
              return updated.slice(-30);
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch recent capsules:', error);
      }
    };

    // Initial fetch
    fetchRecentCapsules();

    // Set up interval to fetch every 10 seconds
    intervalId = setInterval(fetchRecentCapsules, 10000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Remove danmaku after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (danmakus.length > 0) {
        setDanmakus(prev => prev.slice(1));
      }
    }, 10000); // Match animation duration

    return () => clearTimeout(timer);
  }, [danmakus]);

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 10 }}
    >
      {danmakus.map((danmaku) => (
        <div
          key={danmaku.id}
          className="absolute whitespace-nowrap text-white text-sm font-medium px-3 py-1 rounded-full bg-black bg-opacity-30 backdrop-blur-sm"
          style={{
            top: `${danmaku.top}%`,
            right: '-100%',
            animation: 'danmaku-slide 10s linear forwards',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {danmaku.text}
        </div>
      ))}

      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="absolute top-4 left-4 pointer-events-auto btn hud px-2.5 py-1.5 flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
        title="开关弹幕"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
        <span className="data">弹幕</span>
      </button>

      <style>
        {`
          @keyframes danmaku-slide {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-100vw);
            }
          }
        `}
      </style>
    </div>
  );
};

export default DanmakuLayer;