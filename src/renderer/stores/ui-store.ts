// src/renderer/stores/ui-store.ts
// UI 状态管理

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { DEFAULT_SIDEBAR_WIDTH } from '../../shared/constants';

export type EditorMode = 'edit' | 'preview' | 'split';
export type ThemeMode = 'light' | 'dark';

export const useUiStore = defineStore('ui', () => {
  // ─── State ──────────────────────────────────────

  /** 侧边栏宽度（px） */
  const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH);

  /** 编辑器视图模式 */
  const viewMode = ref<EditorMode>('edit');

  /** 主题 */
  const theme = ref<ThemeMode>('light');

  /** 侧边栏是否折叠 */
  const sidebarCollapsed = ref(false);

  /** 是否显示标签面板 */
  const showTagPanel = ref(true);

  // ─── Actions ────────────────────────────────────

  /** 设置侧边栏宽度 */
  function setSidebarWidth(width: number): void {
    sidebarWidth.value = Math.max(180, Math.min(500, width));
  }

  /** 设置编辑器视图模式 */
  function setViewMode(mode: EditorMode): void {
    viewMode.value = mode;
  }

  /** 切换主题 */
  function setTheme(newTheme: ThemeMode): void {
    theme.value = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  /** 折叠/展开侧边栏 */
  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  /** 切换标签面板 */
  function toggleTagPanel(): void {
    showTagPanel.value = !showTagPanel.value;
  }

  return {
    // state
    sidebarWidth,
    viewMode,
    theme,
    sidebarCollapsed,
    showTagPanel,
    // actions
    setSidebarWidth,
    setViewMode,
    setTheme,
    toggleSidebar,
    toggleTagPanel,
  };
});
