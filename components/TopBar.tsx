import React, { useEffect } from 'react';
import { History, Maximize2, Menu, Minimize2, PanelLeft, Settings, Trash2 } from 'lucide-react';
import { ApiMode, Language, Model, ModelModality } from '../types';

interface TopBarProps {
  language: Language;
  isSidebarOpen: boolean;
  isGridMode: boolean;
  onOpenSidebar: () => void;
  onToggleSidebar: () => void;
  availableModels: Model[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  confirmAndClearChats: () => void;
  showHistoryButton: boolean;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  modelModalityFilter: ModelModality | null;
  onToggleModelModalityFilter: (next: ModelModality | null) => void;
  apiMode: ApiMode;
  setApiMode: (mode: ApiMode) => void;
  onOpenSettings: () => void;
  isFullView: boolean;
  onToggleFullView: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  language,
  isSidebarOpen,
  onOpenSidebar,
  onToggleSidebar,
  availableModels,
  selectedModelId,
  onSelectModel,
  confirmAndClearChats,
  showHistoryButton,
  isHistoryOpen,
  onToggleHistory,
  modelModalityFilter,
  onToggleModelModalityFilter,
  apiMode,
  setApiMode,
  onOpenSettings,
  isFullView,
  onToggleFullView,
}) => {
  const resolveModelModality = (model: Model): ModelModality => {
    if (model.modality) return model.modality;
    const id = (model.id || '').toLowerCase();
    if (id.includes('sora-video')) return 'video';
    if (id.includes('image')) return 'image';
    return 'text';
  };

  const filteredModels =
    apiMode === 'gemini'
      ? availableModels.filter((m) => m.provider === 'gemini')
      : availableModels.filter((m) => !m.provider || m.provider === 'openai');

  const filteredByModality = modelModalityFilter
    ? filteredModels.filter((m) => resolveModelModality(m) === modelModalityFilter)
    : filteredModels;

  useEffect(() => {
    if (!modelModalityFilter) return;
    if (filteredModels.length > 0 && filteredByModality.length === 0) {
      onToggleModelModalityFilter(null);
    }
  }, [modelModalityFilter, filteredModels.length, filteredByModality.length, onToggleModelModalityFilter]);

  const currentSelectedExists = filteredByModality.some((m) => m.id === selectedModelId);
  const effectiveSelectedId = currentSelectedExists ? selectedModelId : filteredByModality[0]?.id || selectedModelId;

  useEffect(() => {
    if (!effectiveSelectedId) return;
    if (effectiveSelectedId !== selectedModelId) {
      onSelectModel(effectiveSelectedId);
    }
  }, [effectiveSelectedId, selectedModelId, onSelectModel]);

  const appName = language === 'zh' ? '昼夜交互科技' : 'DayNight Interactive Tech';
  const appVersion = '4.2';

  return (
    <header className="app-topbar glass-topbar">
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, minWidth: 0 }}>
        {!isSidebarOpen && (
          <button onClick={onOpenSidebar} className="jelly-hover btn-settings" aria-label={language === 'zh' ? '打开侧边栏' : 'Open sidebar'}>
            <PanelLeft size={20} />
          </button>
        )}
        <div className="md:hidden">
          <button onClick={onToggleSidebar} className="jelly-hover btn-settings" aria-label={language === 'zh' ? '菜单' : 'Menu'}>
            <Menu size={20} />
          </button>
        </div>
        <h1 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }} className="text-gray-900 dark:text-white hidden md:flex">
          <span className="text-shine">{appName}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{appVersion}</span>
        </h1>
      </div>

      {/* Center */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {/* Filter group */}
        <div className="filter-group">
          {[
            { id: 'video', label: language === 'zh' ? '视频' : 'Video', cls: 'active-video' },
            { id: 'image', label: language === 'zh' ? '图片' : 'Image', cls: 'active-image' },
            { id: 'text', label: language === 'zh' ? '文字' : 'Text', cls: 'active-text' },
          ].map((item) => {
            const isActive = modelModalityFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleModelModalityFilter(modelModalityFilter === item.id ? null : (item.id as ModelModality))}
                className={`filter-btn jelly-hover ${isActive ? item.cls : ''}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Model select */}
        <div className="flex items-center gap-2 rounded-lg px-2 h-10 border border-gray-200/50 dark:border-white/10">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {language === 'zh' ? '模型' : 'Model'}:
          </span>
          <select
            onChange={(e) => onSelectModel(e.target.value)}
            className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer py-1 min-w-[180px]"
            value={effectiveSelectedId}
          >
            {filteredByModality.map((m) => (
              <option key={m.id} value={m.id} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Fullscreen */}
        <button onClick={onToggleFullView}
          className={`jelly-hover btn-fullscreen ${isFullView ? 'active' : ''}`}
          title={language === 'zh' ? (isFullView ? '退出全屏' : '全屏视图') : (isFullView ? 'Exit fullscreen' : 'Fullscreen view')}
        >
          {isFullView ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* History */}
        {showHistoryButton && (
          <button onClick={onToggleHistory}
            className={`jelly-soft btn-history ${isHistoryOpen ? 'active' : ''}`}
            title={language === 'zh' ? '打开侧边栏的历史记录面板' : 'Open history panel in sidebar'}
          >
            <History size={14} />
            <span className="hidden sm:inline">{language === 'zh' ? '历史记录' : 'History'}</span>
          </button>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
        <button onClick={confirmAndClearChats} className="jelly-hover btn-clear"
          title={language === 'zh' ? '清空所有对话' : 'Clear all chats'}
        >
          <Trash2 size={14} />
          <span className="hidden sm:inline">{language === 'zh' ? '清空' : 'Clear'}</span>
        </button>

        <div className="api-toggle">
          <button type="button" onClick={() => setApiMode('openai')}
            className={`jelly-hover api-btn ${apiMode === 'openai' ? 'active-openai' : ''}`}
          >OpenAI</button>
          <button type="button" onClick={() => setApiMode('gemini')}
            className={`jelly-hover api-btn ${apiMode === 'gemini' ? 'active-gemini' : ''}`}
          >Gemini</button>
        </div>

        <button onClick={onOpenSettings} className="jelly-hover btn-settings"
          aria-label={language === 'zh' ? '设置' : 'Settings'}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
