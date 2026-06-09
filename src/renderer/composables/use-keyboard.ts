// src/renderer/composables/use-keyboard.ts
// 全局键盘快捷键

import { onMounted, onBeforeUnmount } from 'vue';

export interface KeyboardShortcutHandlers {
  /** Ctrl+N: 新建笔记 */
  onNewNote?: () => void;
  /** Ctrl+S: 保存当前笔记 */
  onSave?: () => void;
  /** Ctrl+F: 聚焦搜索框 */
  onFocusSearch?: () => void;
  /** Ctrl+Shift+N: 新建目录 */
  onNewFolder?: () => void;
  /** Ctrl+Delete: 删除选中笔记 */
  onDeleteNote?: () => void;
  /** Ctrl+E: 切换编辑/预览模式 */
  onToggleEditPreview?: () => void;
  /** Ctrl+Shift+E: 切换分栏模式 */
  onToggleSplit?: () => void;
}

/**
 * 注册全局键盘快捷键
 * 在组件 setup 中调用，自动在 onMounted 注册、onBeforeUnmount 注销
 */
export function useKeyboard(handlers: KeyboardShortcutHandlers): void {
  function handleKeyDown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if (!ctrl) return;

    // Ctrl+N: 新建笔记
    if (e.key === 'n' && !shift) {
      e.preventDefault();
      handlers.onNewNote?.();
      return;
    }

    // Ctrl+S: 保存
    if (e.key === 's' && !shift) {
      e.preventDefault();
      handlers.onSave?.();
      return;
    }

    // Ctrl+F: 聚焦搜索
    if (e.key === 'f' && !shift) {
      e.preventDefault();
      handlers.onFocusSearch?.();
      return;
    }

    // Ctrl+Shift+N: 新建目录
    if (e.key === 'N' && shift) {
      e.preventDefault();
      handlers.onNewFolder?.();
      return;
    }

    // Ctrl+Delete: 删除笔记
    if (e.key === 'Delete' && !shift) {
      e.preventDefault();
      handlers.onDeleteNote?.();
      return;
    }

    // Ctrl+E: 切换编辑/预览
    if (e.key === 'e' && !shift) {
      e.preventDefault();
      handlers.onToggleEditPreview?.();
      return;
    }

    // Ctrl+Shift+E: 切换分栏
    if (e.key === 'E' && shift) {
      e.preventDefault();
      handlers.onToggleSplit?.();
      return;
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });
}
