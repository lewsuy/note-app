// src/renderer/stores/tag-store.ts
// 标签状态管理

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Tag, TagWithCount, CreateTagParams, UpdateTagParams } from '../../shared/types';

export const useTagStore = defineStore('tag', () => {
  // ─── State ──────────────────────────────────────

  /** 所有标签（含笔记数量） */
  const tags = ref<TagWithCount[]>([]);

  /** 当前激活的标签 ID（用于筛选） */
  const activeTagId = ref<string | null>(null);

  /** 加载状态 */
  const loading = ref(false);

  // ─── Actions ────────────────────────────────────

  /** 加载所有标签 */
  async function loadTags(): Promise<void> {
    loading.value = true;
    try {
      const result = await window.api.tag.getAll();
      tags.value = result;
    } catch (err) {
      console.error('加载标签失败:', err);
      tags.value = [];
    } finally {
      loading.value = false;
    }
  }

  /** 创建标签 */
  async function createTag(params: CreateTagParams): Promise<Tag | null> {
    try {
      const tag = await window.api.tag.create(params);
      await loadTags();
      return tag;
    } catch (err) {
      console.error('创建标签失败:', err);
      return null;
    }
  }

  /** 更新标签 */
  async function updateTag(id: string, params: UpdateTagParams): Promise<void> {
    try {
      await window.api.tag.update(id, params);
      await loadTags();
    } catch (err) {
      console.error('更新标签失败:', err);
    }
  }

  /** 删除标签 */
  async function deleteTag(id: string): Promise<void> {
    try {
      await window.api.tag.delete(id);
      if (activeTagId.value === id) {
        activeTagId.value = null;
      }
      await loadTags();
    } catch (err) {
      console.error('删除标签失败:', err);
    }
  }

  /** 设置激活标签（筛选） */
  function setActiveTag(id: string | null): void {
    activeTagId.value = id;
  }

  /** 清除筛选 */
  function clearFilter(): void {
    activeTagId.value = null;
  }

  return {
    // state
    tags,
    activeTagId,
    loading,
    // actions
    loadTags,
    createTag,
    updateTag,
    deleteTag,
    setActiveTag,
    clearFilter,
  };
});
