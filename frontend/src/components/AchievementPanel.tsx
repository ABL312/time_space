import React, { useState } from 'react';
import { Achievement } from '../hooks/useAchievements';

interface AchievementPanelProps {
  achievements: Achievement[];
  isOpen: boolean;
  onClose: () => void;
}

const AchievementPanel: React.FC<AchievementPanelProps> = ({ 
  achievements, 
  isOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked'>('all');

  if (!isOpen) return null;

  const filteredAchievements = activeTab === 'all' 
    ? achievements 
    : achievements.filter(a => a.unlocked);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">探索成就</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            className={`flex-1 py-3 text-center ${
              activeTab === 'all' 
                ? 'border-b-2 border-indigo-500 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('all')}
          >
            全部成就
          </button>
          <button
            className={`flex-1 py-3 text-center ${
              activeTab === 'unlocked' 
                ? 'border-b-2 border-indigo-500 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('unlocked')}
          >
            已解锁
          </button>
        </div>

        {/* Achievements List */}
        <div className="overflow-y-auto flex-1 p-4">
          {filteredAchievements.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {activeTab === 'all' ? '暂无成就' : '还没有解锁任何成就'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAchievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className={`rounded-lg p-4 ${
                    achievement.unlocked 
                      ? 'bg-gradient-to-br from-indigo-900 to-purple-900 border border-indigo-700' 
                      : 'bg-gray-700 bg-opacity-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`text-2xl p-2 rounded-lg ${
                      achievement.unlocked 
                        ? 'bg-yellow-500 bg-opacity-20' 
                        : 'bg-gray-600 bg-opacity-30'
                    }`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h3 className={`font-semibold truncate ${
                          achievement.unlocked ? 'text-yellow-300' : 'text-gray-300'
                        }`}>
                          {achievement.title}
                        </h3>
                        {achievement.unlocked && (
                          <span className="text-xs bg-green-500 bg-opacity-20 text-green-300 px-2 py-1 rounded">
                            已解锁
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1 mb-2">
                        {achievement.description}
                      </p>
                      
                      {!achievement.unlocked ? (
                        <>
                          <div className="w-full bg-gray-600 rounded-full h-2 mb-1">
                            <div 
                              className="bg-indigo-500 h-2 rounded-full" 
                              style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-400">
                            {achievement.progress} / {achievement.target}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">
                          解锁于 {formatDate(achievement.unlockTime)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AchievementPanel;