export type TimeTheme = 'morning' | 'afternoon' | 'evening' | 'night';

export const useTimeTheme = (): TimeTheme => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    return 'morning'; // 6-11点: morning (暖色调)
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon'; // 12-17点: afternoon (明亮)
  } else if (hour >= 18 && hour < 22) {
    return 'evening'; // 18-21点: evening (橙紫渐变)
  } else {
    return 'night'; // 22-5点: night (深蓝+星光)
  }
};

export default useTimeTheme;