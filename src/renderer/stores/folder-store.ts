// src/renderer/stores/folder-store.ts
// 目录状态管理

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FolderTreeNode, CreateFolderParams, UpdateFolderParams } from '../../shared/types';

export const useFolderStore = defineStore('folder', () => {
  // ─── State ──────────────────────────────────────

  /** 目录树 */
  const tree = ref<FolderTreeNode[]>([]);

  /** 当前选中目录 ID */
  const currentFolderId = ref<string | null>(null);

  /** 加载状态 */
  const loading = ref(false);

  // ─── Actions ────────────────────────────────────

  /** 加载目录树 */
  async function loadTree(): Promise<void> {
    loading.value = true;
    try {
      const result = await window.api.folder.getTree();
      tree.value = result;
    } catch (err) {
      console.error('加载目录树失败:', err);
      tree.value = [];
    } finally {
      loading.value = false;
    }
  }

  /** 创建目录 */
  async function createFolder(params: CreateFolderParams): Promise<void> {
    try {
      await window.api.folder.create(params);
      await loadTree();
    } catch (err) {
      console.error('创建目录失败:', err);
    }
  }

  /** 更新目录 */
  async function updateFolder(id: string, params: UpdateFolderParams): Promise<void> {
    try {
      await window.api.folder.update(id, params);
      await loadTree();
    } catch (err) {
      console.error('更新目录失败:', err);
    }
  }

  /** 删除目录 */
  async function deleteFolder(id: string): Promise<void> {
    try {
      await window.api.folder.delete(id);
      if (currentFolderId.value === id) {
        currentFolderId.value = null;
      }
      await loadTree();
    } catch (err) {
      console.error('删除目录失败:', err);
    }
  }

  /** 移动目录 */
  async function moveFolder(id: string, parentId: string | null): Promise<void> {
    try {
      await window.api.folder.move(id, parentId);
      await loadTree();
    } catch (err) {
      console.error('移动目录失败:', err);
    }
  }

  /** 重排目录 */
  async function reorderFolders(ids: string[]): Promise<void> {
    try {
      await window.api.folder.reorder(ids);
      await loadTree();
    } catch (err) {
      console.error('重排目录失败:', err);
    }
  }

  /** 设置当前目录 */
  function setCurrentFolder(id: string | null): void {
    currentFolderId.value = id;
  }

  /** 在树中查找节点 */
  function findNode(id: string): FolderTreeNode | null {
    function search(nodes: FolderTreeNode[]): FolderTreeNode | null {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children.length > 0) {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return null;
    }
    return search(tree.value);
  }

  /** 获取目录路径（面包屑用） */
  function getFolderPath(id: string): FolderTreeNode[] {
    const path: FolderTreeNode[] = [];
    function search(nodes: FolderTreeNode[], ancestors: FolderTreeNode[]): boolean {
      for (const node of nodes) {
        const current = [...ancestors, node];
        if (node.id === id) {
          path.push(...current);
          return true;
        }
        if (node.children.length > 0) {
          if (search(node.children, current)) return true;
        }
      }
      return false;
    }
    search(tree.value, []);
    return path;
  }

  return {
    // state
    tree,
    currentFolderId,
    loading,
    // actions
    loadTree,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    reorderFolders,
    setCurrentFolder,
    findNode,
    getFolderPath,
  };
});
