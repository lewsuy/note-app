// src/renderer/env.d.ts
// Vue 类型声明

/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Electron API 类型声明
interface ElectronAPI {
  note: {
    create: (params: any) => Promise<any>;
    get: (id: string) => Promise<any>;
    getAll: (options?: any) => Promise<any>;
    getByFolder: (folderId: string) => Promise<any>;
    update: (id: string, params: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    move: (ids: string[], targetFolderId: string) => Promise<any>;
    search: (keyword: string, options?: any) => Promise<any>;
  };
  folder: {
    create: (params: any) => Promise<any>;
    getTree: () => Promise<any>;
    update: (id: string, params: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    move: (id: string, parentId: string | null) => Promise<any>;
    reorder: (ids: string[]) => Promise<any>;
  };
  tag: {
    create: (params: any) => Promise<any>;
    getAll: () => Promise<any>;
    update: (id: string, params: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    getNotesByTag: (tagId: string) => Promise<any>;
  };
  noteTag: {
    getTags: (noteId: string) => Promise<any>;
    addTag: (noteId: string, tagId: string) => Promise<any>;
    removeTag: (noteId: string, tagId: string) => Promise<any>;
  };
  io: {
    importFiles: (filePaths: string[], folderId: string) => Promise<any>;
    importFilesDialog: (folderId: string) => Promise<any>;
    importFolder: (folderPath: string, folderId: string) => Promise<any>;
    importFolderDialog: (folderId: string) => Promise<any>;
    exportNote: (noteId: string, targetPath: string, options?: any) => Promise<any>;
    exportNoteDialog: (noteId: string, noteTitle: string, options?: any) => Promise<any>;
    exportFolder: (folderId: string, targetPath: string, options?: any) => Promise<any>;
    exportFolderDialog: (folderId: string, options?: any) => Promise<any>;
  };
  settings: {
    get: (key?: string) => Promise<any>;
    set: (key: string, value: string) => Promise<any>;
  };
  dialog: {
    openFile: (options?: any) => Promise<any>;
    saveFile: (options?: any) => Promise<any>;
  };
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeListener: (channel: string, callback: (...args: any[]) => void) => void;
}

declare interface Window {
  api: ElectronAPI;
}
