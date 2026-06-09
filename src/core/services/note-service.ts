// src/core/services/note-service.ts
// 笔记 CRUD 服务 - 封装业务逻辑

import { noteRepository } from '../database/repositories/note-repository';
import { tagRepository } from '../database/repositories/tag-repository';
import {
  Note,
  NoteDetail,
  NoteSummary,
  CreateNoteParams,
  UpdateNoteParams,
  GetNotesOptions,
  SearchOptions,
  SearchResult,
} from '../../shared/types';
import { getDb } from '../database/db';

/**
 * 笔记服务
 */
export const noteService = {
  /**
   * 创建笔记
   */
  create(params: CreateNoteParams): Note {
    const note = noteRepository.create(params);

    // 处理标签关联
    if (params.tags && params.tags.length > 0) {
      const allTags = tagRepository.getAll();
      for (const tagName of params.tags) {
        const existingTag = allTags.find(t => t.name === tagName);
        if (existingTag) {
          tagRepository.addTagToNote(note.id, existingTag.id);
        }
      }
    }

    return note;
  },

  /**
   * 获取笔记详情（含正文）
   */
  getById(id: string): NoteDetail | null {
    return noteRepository.getById(id);
  },

  /**
   * 获取笔记列表（不含正文）
   */
  getAll(options?: GetNotesOptions): NoteSummary[] {
    return noteRepository.getAll(options);
  },

  /**
   * 按目录获取笔记列表
   */
  getByFolder(folderId: string): NoteSummary[] {
    return noteRepository.getByFolder(folderId);
  },

  /**
   * 更新笔记
   */
  update(id: string, params: UpdateNoteParams): Note | null {
    return noteRepository.update(id, params);
  },

  /**
   * 删除笔记
   */
  delete(id: string): void {
    noteRepository.delete(id);
  },

  /**
   * 移动笔记到另一个目录
   */
  move(ids: string[], targetFolderId: string): void {
    noteRepository.move(ids, targetFolderId);
  },

  /**
   * 全文搜索笔记
   */
  search(keyword: string, options?: SearchOptions): SearchResult[] {
    const db = getDb();
    const limit = options?.limit || 50;

    let sql = `
      SELECT n.id as noteId, n.title, n.folder_id,
             SUBSTR(n.title, 1, 200) as snippet,
             1 as matchCount
      FROM notes n
      WHERE n.title LIKE ?
    `;
    const params: any[] = [`%${keyword}%`];

    if (options?.folderId) {
      sql += ' AND n.folder_id = ?';
      params.push(options.folderId);
    }

    sql += ' ORDER BY n.updated_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as any[];

    return rows.map(row => ({
      noteId: row.noteId,
      title: row.title,
      snippet: row.snippet,
      matchCount: row.matchCount,
      folderPath: row.folder_id,
    }));
  },
};
