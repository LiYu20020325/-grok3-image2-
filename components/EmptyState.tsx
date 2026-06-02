import React from 'react';
import { Film, Image, Sparkles, Layers, Clapperboard } from 'lucide-react';
import { Language, ToolView } from '../types';

interface EmptyStateProps {
  language: Language;
  onOpenTool: (tool: ToolView) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ language, onOpenTool }) => {
  const cards = [
    {
      id: 'promptLibrary' as ToolView,
      title: language === 'zh' ? '图片提示词库' : 'Prompt Library',
      desc: language === 'zh' ? '收藏、搜索、自定义、一键复制' : 'Browse, save, and copy prompts',
      icon: Image,
      enabled: true,
    },
    {
      id: 'videoFrames' as ToolView,
      title: language === 'zh' ? '提取视频首尾帧' : 'Video Frames',
      desc: language === 'zh' ? '上传 30 秒内视频并导出首/尾帧' : 'Extract first/last frame',
      icon: Film,
      enabled: true,
    },
    {
      id: 'xhs' as ToolView,
      title: language === 'zh' ? 'XHS 灵感实验室' : 'XHS Lab',
      desc: language === 'zh' ? '灵感输入与内容结构输出' : 'Idea to outline',
      icon: Sparkles,
      enabled: true,
    },
    {
      id: 'douyin' as ToolView,
      title: language === 'zh' ? '抖音灵感实验室' : 'Douyin Lab',
      desc: language === 'zh' ? '短视频选题与分镜脚本' : 'Short-video outline',
      icon: Clapperboard,
      enabled: true,
    },
    {
      id: 'pdd' as ToolView,
      title: language === 'zh' ? '拼多多灵感实验室' : 'Pinduoduo Lab',
      desc: language === 'zh' ? '电商卖点与主图方案' : 'E-commerce visual plan',
      icon: Layers,
      enabled: true,
    },
    {
      id: 'more' as ToolView,
      title: language === 'zh' ? '更多功能' : 'More Tools',
      desc: language === 'zh' ? '敬请期待' : 'Coming soon',
      icon: Layers,
      enabled: false,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div className="mb-12 text-center">
        <h2 className="text-flow-gradient text-4xl font-bold mb-4 tracking-tight">
          {language === 'zh' ? '昼夜交互科技' : 'DayNight Interactive Tech'}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => card.enabled && onOpenTool(card.id)}
            disabled={!card.enabled}
            className={`card-flow jelly-hover p-5 rounded-2xl text-left transition-colors h-40 flex flex-col justify-between group border ${
              card.enabled
                ? 'bg-white/40 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/60'
                : 'bg-white/20 dark:bg-gray-800/30 border-gray-200/50 dark:border-gray-800/60 opacity-60 cursor-default'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
                <card.icon size={18} />
                <span className="text-xs uppercase tracking-wide">{language === 'zh' ? '工具' : 'Tool'}</span>
              </div>
              <div className="font-medium text-gray-900 dark:text-white mb-1">{card.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{card.desc}</div>
            </div>
            <div className="flex justify-end items-center text-xs text-gray-400 dark:text-gray-500">
              {card.enabled ? (language === 'zh' ? '点击进入' : 'Enter') : language === 'zh' ? '即将开放' : 'Soon'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
