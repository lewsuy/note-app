// src/preload/index.ts
// Preload 脚本 - 通过 contextBridge 暴露安全 API 给渲染进程

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';

/**
 * 暴露给渲染进程的 API
 * 所有与主进程的通信都通过此 API 进行
 */
const api = {
  // 笔记操作
  note: {
    create: (params: { title: string; folderId: string; content?: string; tags?: string[] }) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE, params),

    get: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET, id),

    getAll: (options?: { sortBy?: string; sortOrder?: string; limit?: number; offset?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET_ALL, options),

    getByFolder: (folderId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET_BY_FOLDER, folderId),

    update: (id: string, params: { title?: string; content?: string; folderId?: string; isPinned?: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_UPDATE, id, params),

    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, id),

    move: (ids: string[], targetFolderId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_MOVE, ids, targetFolderId),

    search: (keyword: string, options?: { folderId?: string; tagIds?: string[]; limit?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_SEARCH, keyword, options),
  },

  // 目录操作
  folder: {
    create: (params: { name: string; parentId?: string | null }) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_CREATE, params),

    getTree: () =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_GET_TREE),

    update: (id: string, params: { name?: string; icon?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_UPDATE, id, params),

    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_DELETE, id),

    move: (id: string, parentId: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_MOVE, id, parentId),

    reorder: (ids: string[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.FOLDER_REORDER, ids),
  },

  // 标签操作
  tag: {
    create: (params: { name: string; color?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAG_CREATE, params),

    getAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TAG_GET_ALL),

    update: (id: string, params: { name?: string; color?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAG_UPDATE, id, params),

    delete: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAG_DELETE, id),

    getNotesByTag: (tagId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAG_GET_NOTES, tagId),
  },

  // 笔记标签关联
  noteTag: {
    getTags: (noteId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET_TAGS, noteId),

    addTag: (noteId: string, tagId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_ADD_TAG, noteId, tagId),

    removeTag: (noteId: string, tagId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTE_REMOVE_TAG, noteId, tagId),
  },

  // 导入导出
  io: {
    /** 导入单个或多个 .md 文件到指定目录 */
    importFiles: (filePaths: string[], folderId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FILES, filePaths, folderId),
    /** 通过对话框选择文件并导入 */
    importFilesDialog: async (folderId: string) => {
      const windowId = await ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_FILE, {
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
      });
      if (!windowId) return null;
      return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FILES, windowId, folderId);
    },

    /** 导入文件夹下所有 .md 文件 */
    importFolder: (folderPath: string, folderId: string): Promise<{ success: boolean; count: number }> =>
      ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FOLDER, folderPath, folderId),
    /** 通过对话框选择文件夹并导入 */
    importFolderDialog: async (folderId: string) => {
      const folderPaths = await ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_FILE, {
        properties: ['openDirectory'],
      });
      if (!folderPaths || folderPaths.length === 0) return null;
      return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_FOLDER, folderPaths[0], folderId);
    },

    /** 导出单个笔记为 .md 文件 */
    exportNote: (noteId: string, targetPath: string, options?: { includeFrontMatter?: boolean }): Promise<{ success: boolean; filePath: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_NOTE, noteId, targetPath, options),
    /** 通过对话框选择路径导出笔记 */
    exportNoteDialog: async (noteId: string, noteTitle: string, options?: { includeFrontMatter?: boolean }) => {
      const savePath = await ipcRenderer.invoke(IPC_CHANNELS.APP_SAVE_FILE, {
        defaultPath: `${noteTitle}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (!savePath) return null;
      return ipcRenderer.invoke(IPC_CHANNELS.EXPORT_NOTE, noteId, savePath, options);
    },

    /** 导出目录下所有笔记 */
    exportFolder: (folderId: string, targetPath: string, options?: { includeFrontMatter?: boolean }): Promise<{ success: boolean; count: number }> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_FOLDER, folderId, targetPath, options),

    /** 通过对话框选择文件夹导出 */
    exportFolderDialog: async (folderId: string, options?: { includeFrontMatter?: boolean }) => {
      const folderPaths = await ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_FILE, {
        properties: ['openDirectory'],
      });
      if (!folderPaths || folderPaths.length === 0) return null;
      return ipcRenderer.invoke(IPC_CHANNELS.EXPORT_FOLDER, folderId, folderPaths[0], options);
    },
  },

  // 应用设置
  settings: {
    get: (key?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SETTINGS, key),

    set: (key: string, value: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_SET_SETTING, key, value),
  },

  // 系统对话框
  dialog: {
    openFile: (options?: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_FILE, options),

    saveFile: (options?: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_SAVE_FILE, options),
  },

  // 菜单事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'menu:new-note',
      'menu:new-folder',
      'menu:import',
      'menu:export',
      'menu:about',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  // 移除事件监听
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('api', api);

// 类型声明 - 渲染进程使用
export type ElectronAPI = typeof api;
