// src/shared/types.ts
// 共享类型定义 - 主进程与渲染进程共用

/** 笔记完整数据 */
export interface Note {
  id: string;
  title: string;
  folderId: string;
  filePath: string;
  isPinned: boolean;
  wordCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** 笔记详情（含正文） */
export interface NoteDetail extends Note {
  content: string;
}

/** 笔记摘要（列表用，不含正文） */
export interface NoteSummary {
  id: string;
  title: string;
  folderId: string;
  filePath: string;
  isPinned: boolean;
  wordCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** 目录 */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

/** 目录树节点（递归） */
export interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  icon: string;
  children: FolderTreeNode[];
  noteCount: number;
}

/** 标签 */
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

/** 标签（含笔记数量） */
export interface TagWithCount extends Tag {
  noteCount: number;
}

/** 搜索结果 */
export interface SearchResult {
  noteId: string;
  title: string;
  snippet: string;
  matchCount: number;
  folderPath: string;
}

/** 应用设置 */
export interface AppSettings {
  dataDir: string;
  editorFontSize: number;
  editorTheme: 'light' | 'dark';
  autoSaveInterval: number;
  lastOpenedNote: string | null;
  lastOpenedFolder: string | null;
  sidebarWidth: number;
  editorPreviewMode: 'edit' | 'preview' | 'split';
}

/** 创建笔记参数 */
export interface CreateNoteParams {
  title: string;
  folderId: string;
  content?: string;
  tags?: string[];
}

/** 更新笔记参数 */
export interface UpdateNoteParams {
  title?: string;
  content?: string;
  folderId?: string;
  isPinned?: boolean;
}

/** 创建目录参数 */
export interface CreateFolderParams {
  name: string;
  parentId?: string | null;
}

/** 更新目录参数 */
export interface UpdateFolderParams {
  name?: string;
  icon?: string;
}

/** 创建标签参数 */
export interface CreateTagParams {
  name: string;
  color?: string;
}

/** 更新标签参数 */
export interface UpdateTagParams {
  name?: string;
  color?: string;
}

/** 获取笔记列表选项 */
export interface GetNotesOptions {
  sortBy?: 'updated_at' | 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/** 搜索选项 */
export interface SearchOptions {
  folderId?: string;
  tagIds?: string[];
  limit?: number;
}
