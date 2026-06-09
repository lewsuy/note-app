// src/renderer/stores/note-store.ts
// 笔记状态管理

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { NoteSummary, NoteDetail, CreateNoteParams, UpdateNoteParams } from '../../shared/types';

export const useNoteStore = defineStore('note', () => {
  // ─── State ──────────────────────────────────────

  /** 当前笔记详情 */
  const currentNote = ref<NoteDetail | null>(null);

  /** 笔记列表 */
  const notes = ref<NoteSummary[]>([]);

  /** 加载状态 */
  const loading = ref(false);

  // ─── Getters ────────────────────────────────────

  /** 已固定的笔记 */
  const pinnedNotes = computed(() =>
    notes.value.filter((n) => n.isPinned)
  );

  /** 未固定的笔记 */
  const unpinnedNotes = computed(() =>
    notes.value.filter((n) => !n.isPinned)
  );

  /** 排序后的笔记列表（固定在前） */
  const sortedNotes = computed(() => [
    ...pinnedNotes.value,
    ...unpinnedNotes.value,
  ]);

  // ─── Actions ────────────────────────────────────

  /** 按目录加载笔记列表 */
  async function loadByFolder(folderId: string): Promise<void> {
    loading.value = true;
    try {
      const result = await window.api.note.getByFolder(folderId);
      notes.value = result;
    } catch (err) {
      console.error('加载笔记列表失败:', err);
      notes.value = [];
    } finally {
      loading.value = false;
    }
  }

  /** 加载所有笔记 */
  async function loadAll(): Promise<void> {
    loading.value = true;
    try {
      const result = await window.api.note.getAll();
      notes.value = result;
    } catch (err) {
      console.error('加载笔记列表失败:', err);
      notes.value = [];
    } finally {
      loading.value = false;
    }
  }

  /** 按 ID 加载笔记详情 */
  async function loadById(id: string): Promise<void> {
    loading.value = true;
    try {
      const result = await window.api.note.get(id);
      currentNote.value = result;
    } catch (err) {
      console.error('加载笔记详情失败:', err);
    } finally {
      loading.value = false;
    }
  }

  /** 创建笔记 */
  async function createNote(params: CreateNoteParams): Promise<NoteDetail | null> {
    try {
      const note = await window.api.note.create(params);
      // 刷新列表
      if (params.folderId) {
        await loadByFolder(params.folderId);
      }
      return note;
    } catch (err) {
      console.error('创建笔记失败:', err);
      return null;
    }
  }

  /** 更新笔记 */
  async function updateNote(id: string, params: UpdateNoteParams): Promise<void> {
    try {
      const updated = await window.api.note.update(id, params);
      // 更新列表中的对应项
      const idx = notes.value.findIndex((n) => n.id === id);
      if (idx !== -1) {
        notes.value[idx] = { ...notes.value[idx], ...updated };
      }
      // 更新当前笔记
      if (currentNote.value?.id === id) {
        currentNote.value = { ...currentNote.value, ...params, ...updated };
      }
    } catch (err) {
      console.error('更新笔记失败:', err);
    }
  }

  /** 删除笔记 */
  async function deleteNote(id: string): Promise<void> {
    try {
      await window.api.note.delete(id);
      // 从列表移除
      notes.value = notes.value.filter((n) => n.id !== id);
      // 如果删除的是当前笔记，清空
      if (currentNote.value?.id === id) {
        currentNote.value = null;
      }
    } catch (err) {
      console.error('删除笔记失败:', err);
    }
  }

  /** 移动笔记到目标目录 */
  async function moveNotes(ids: string[], targetFolderId: string): Promise<void> {
    try {
      await window.api.note.move(ids, targetFolderId);
      // 从列表移除已移动的笔记
      notes.value = notes.value.filter((n) => !ids.includes(n.id));
      if (currentNote.value && ids.includes(currentNote.value.id)) {
        currentNote.value = null;
      }
    } catch (err) {
      console.error('移动笔记失败:', err);
    }
  }

  /** 清空当前笔记 */
  function clearCurrent(): void {
    currentNote.value = null;
  }

  return {
    // state
    currentNote,
    notes,
    loading,
    // getters
    pinnedNotes,
    unpinnedNotes,
    sortedNotes,
    // actions
    loadByFolder,
    loadAll,
    loadById,
    createNote,
    updateNote,
    deleteNote,
    moveNotes,
    clearCurrent,
  };
});
