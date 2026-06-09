// src/main/ipc-handlers.ts
// IPC 通道处理注册 - 处理渲染进程的所有请求

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { noteService } from '../core/services/note-service';
import { folderService } from '../core/services/folder-service';
import { tagRepository } from '../core/database/repositories/tag-repository';
import { getDb } from '../core/database/db';
import {
  CreateNoteParams,
  UpdateNoteParams,
  CreateFolderParams,
  UpdateFolderParams,
  CreateTagParams,
  UpdateTagParams,
  GetNotesOptions,
} from '../shared/types';

/**
 * 注册所有 IPC 通道处理
 */
export function registerIpcHandlers(): void {
  console.log('[IPC] 注册 IPC 处理器...');

  // ========== 笔记操作 ==========

  ipcMain.handle(IPC_CHANNELS.NOTE_CREATE, (_event, params: CreateNoteParams) => {
    try {
      return noteService.create(params);
    } catch (err) {
      console.error('[IPC] 创建笔记失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_GET, (_event, id: string) => {
    try {
      return noteService.getById(id);
    } catch (err) {
      console.error('[IPC] 获取笔记失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_GET_ALL, (_event, options?: GetNotesOptions) => {
    try {
      return noteService.getAll(options);
    } catch (err) {
      console.error('[IPC] 获取笔记列表失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_GET_BY_FOLDER, (_event, folderId: string) => {
    try {
      return noteService.getByFolder(folderId);
    } catch (err) {
      console.error('[IPC] 获取目录笔记失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_UPDATE, (_event, id: string, params: UpdateNoteParams) => {
    try {
      return noteService.update(id, params);
    } catch (err) {
      console.error('[IPC] 更新笔记失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, (_event, id: string) => {
    try {
      noteService.delete(id);
      return { success: true };
    } catch (err) {
      console.error('[IPC] 删除笔记失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_MOVE, (_event, ids: string[], targetFolderId: string) => {
    try {
      noteService.move(ids, targetFolderId);
      return { success: true };
    } catch (err) {
      console.error('[IPC] 移动笔记失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_SEARCH, (_event, keyword: string, options?: any) => {
    try {
      return noteService.search(keyword, options);
    } catch (err) {
      console.error('[IPC] 搜索笔记失败:', err);
      throw err;
    }
  });

  // ========== 目录操作 ==========

  ipcMain.handle(IPC_CHANNELS.FOLDER_CREATE, (_event, params: CreateFolderParams) => {
    try {
      return folderService.create(params);
    } catch (err) {
      console.error('[IPC] 创建目录失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_GET_TREE, () => {
    try {
      return folderService.getTree();
    } catch (err) {
      console.error('[IPC] 获取目录树失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_UPDATE, (_event, id: string, params: UpdateFolderParams) => {
    try {
      return folderService.update(id, params);
    } catch (err) {
      console.error('[IPC] 更新目录失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_DELETE, (_event, id: string) => {
    try {
      folderService.delete(id);
      return { success: true };
    } catch (err) {
      console.error('[IPC] 删除目录失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_MOVE, (_event, id: string, parentId: string | null) => {
    try {
      folderService.move(id, parentId);
      return { success: true };
    } catch (err) {
      console.error('[IPC] 移动目录失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_REORDER, (_event, ids: string[]) => {
    try {
      folderService.reorder(ids);
      return { success: true };
    } catch (err) {
      console.error('[IPC] 重排序目录失败:', err);
      throw err;
    }
  });

  // ========== 标签操作 ==========

  ipcMain.handle(IPC_CHANNELS.TAG_CREATE, (_event, params: CreateTagParams) => {
    try {
      return tagRepository.create(params);
    } catch (err) {
      console.error('[IPC] 创建标签失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAG_GET_ALL, () => {
    try {
      return tagRepository.getAll();
    } catch (err) {
      console.error('[IPC] 获取标签列表失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAG_UPDATE, (_event, id: string, params: UpdateTagParams) => {
    try {
      return tagRepository.update(id, params);
    } catch (err) {
      console.error('[IPC] 更新标签失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAG_DELETE, (_event, id: string) => {
    try {
      tagRepository.delete(id);
      return { success: true };
    } catch (err) {
      console.error('[IPC] 删除标签失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAG_GET_NOTES, (_event, tagId: string) => {
    try {
      return tagRepository.getNotesByTag(tagId);
    } catch (err) {
      console.error('[IPC] 获取标签笔记失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_ADD_TAG, (_event, noteId: string, tagId: string) => {
    try {
      tagRepository.addTagToNote(noteId, tagId);
      return { success: true };
    } catch (err) {
      console.error('[IPC] 添加笔记标签失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_REMOVE_TAG, (_event, noteId: string, tagId: string) => {
    try {
      tagRepository.removeTagFromNote(noteId, tagId);
      return { success: true };
    } catch (err) {
      console.error('[IPC] 移除笔记标签失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_GET_TAGS, (_event, noteId: string) => {
    try {
      return tagRepository.getTagsByNote(noteId);
    } catch (err) {
      console.error('[IPC] 获取笔记标签失败:', err);
      throw err;
    }
  });

  // ========== 应用设置 ==========

  ipcMain.handle(IPC_CHANNELS.APP_GET_SETTINGS, (_event, key?: string) => {
    try {
      const db = getDb();
      if (key) {
        const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
        return row?.value || null;
      }
      const rows = db.prepare('SELECT key, value FROM app_settings').all() as any[];
      const settings: Record<string, string> = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      return settings;
    } catch (err) {
      console.error('[IPC] 获取设置失败:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.APP_SET_SETTING, (_event, key: string, value: string) => {
    try {
      const db = getDb();
      db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
      return { success: true };
    } catch (err) {
      console.error('[IPC] 设置失败:', err);
      throw err;
    }
  });

  // ========== 系统对话框 ==========

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_FILE, async (_event, options?: any) => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      ...options,
    });
    return result.canceled ? null : result.filePaths;
  });

  ipcMain.handle(IPC_CHANNELS.APP_SAVE_FILE, async (_event, options?: any) => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;
    const result = await dialog.showSaveDialog(window, {
      filters: [
        { name: 'Markdown', extensions: ['md'] },
      ],
      ...options,
    });
    return result.canceled ? null : result.filePath;
  });

  console.log('[IPC] IPC 处理器注册完成');
}
