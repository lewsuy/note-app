// src/core/database/repositories/note-repository.ts
// 笔记数据访问层 - SQLite CRUD 操作

import { getDb } from '../db';
import { randomUUID as uuidv4 } from 'crypto';
import {
  Note,
  NoteDetail,
  NoteSummary,
  CreateNoteParams,
  UpdateNoteParams,
  GetNotesOptions,
} from '../../../shared/types';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '../db';
import { NOTES_DIR } from '../../../shared/constants';

/** 生成 UUID */
function generateId(): string {
  return (globalThis as any).crypto?.randomUUID?.() || require('crypto').randomUUID();
}

/** 生成 ISO 时间字符串 */
function nowISO(): string {
  return new Date().toISOString();
}

/**
 * 笔记数据仓库
 */
export const noteRepository = {
  /**
   * 创建笔记元数据记录
   */
  create(params: CreateNoteParams): Note {
    const db = getDb();
    const id = generateId();
    const timestamp = nowISO();
    const filePath = `${id}.md`;
    const content = params.content || '';
    const wordCount = content.replace(/\s/g, '').length;

    // 写入文件
    const dataDir = getDataDir();
    const fullFilePath = path.join(dataDir, NOTES_DIR, filePath);
    const dir = path.dirname(fullFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullFilePath, content, 'utf-8');

    // 写入数据库
    db.prepare(`
      INSERT INTO notes (id, title, folder_id, file_path, is_pinned, word_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `).run(id, params.title, params.folderId, filePath, wordCount, timestamp, timestamp);

    return {
      id,
      title: params.title,
      folderId: params.folderId,
      filePath,
      isPinned: false,
      wordCount,
      tags: params.tags || [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  /**
   * 根据 ID 获取笔记详情（含正文）
   */
  getById(id: string): NoteDetail | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT n.*, GROUP_CONCAT(t.name) as tag_names
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.id = ?
      GROUP BY n.id
    `).get(id) as any;

    if (!row) return null;

    // 读取文件内容
    const dataDir = getDataDir();
    const fullFilePath = path.join(dataDir, NOTES_DIR, row.file_path);
    let content = '';
    if (fs.existsSync(fullFilePath)) {
      content = fs.readFileSync(fullFilePath, 'utf-8');
    }

    return {
      id: row.id,
      title: row.title,
      folderId: row.folder_id,
      filePath: row.file_path,
      isPinned: row.is_pinned === 1,
      wordCount: row.word_count,
      tags: row.tag_names ? row.tag_names.split(',') : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      content,
    };
  },

  /**
   * 获取所有笔记列表（不含正文）
   */
  getAll(options?: GetNotesOptions): NoteSummary[] {
    const db = getDb();
    const sortBy = options?.sortBy || 'updated_at';
    const sortOrder = options?.sortOrder || 'desc';
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const validSortColumns = ['updated_at', 'created_at', 'title'];
    const sortCol = validSortColumns.includes(sortBy) ? sortBy : 'updated_at';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const rows = db.prepare(`
      SELECT n.*, GROUP_CONCAT(t.name) as tag_names
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      GROUP BY n.id
      ORDER BY n.is_pinned DESC, n.${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[];

    return rows.map(this.rowToSummary);
  },

  /**
   * 按目录获取笔记列表
   */
  getByFolder(folderId: string): NoteSummary[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT n.*, GROUP_CONCAT(t.name) as tag_names
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.folder_id = ?
      GROUP BY n.id
      ORDER BY n.is_pinned DESC, n.updated_at DESC
    `).all(folderId) as any[];

    return rows.map(this.rowToSummary);
  },

  /**
   * 更新笔记
   */
  update(id: string, params: UpdateNoteParams): Note | null {
    const db = getDb();
    const existing = this.getById(id);
    if (!existing) return null;

    const timestamp = nowISO();
    const title = params.title ?? existing.title;
    const content = params.content ?? existing.content;
    const folderId = params.folderId ?? existing.folderId;
    const isPinned = params.isPinned ?? existing.isPinned;
    const wordCount = content.replace(/\s/g, '').length;

    // 更新文件
    if (params.content !== undefined) {
      const dataDir = getDataDir();
      const fullFilePath = path.join(dataDir, NOTES_DIR, existing.filePath);
      fs.writeFileSync(fullFilePath, content, 'utf-8');
    }

    // 更新数据库
    db.prepare(`
      UPDATE notes SET title = ?, folder_id = ?, is_pinned = ?, word_count = ?, updated_at = ?
      WHERE id = ?
    `).run(title, folderId, isPinned ? 1 : 0, wordCount, timestamp, id);

    return {
      id,
      title,
      folderId,
      filePath: existing.filePath,
      isPinned,
      wordCount,
      tags: existing.tags,
      createdAt: existing.createdAt,
      updatedAt: timestamp,
    };
  },

  /**
   * 删除笔记（同时删除文件和数据库记录）
   */
  delete(id: string): void {
    const db = getDb();
    const existing = this.getById(id);

    // 删除文件
    if (existing) {
      const dataDir = getDataDir();
      const fullFilePath = path.join(dataDir, NOTES_DIR, existing.filePath);
      if (fs.existsSync(fullFilePath)) {
        fs.unlinkSync(fullFilePath);
      }
    }

    // 删除数据库记录（note_tags 通过外键级联删除）
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  },

  /**
   * 移动笔记到另一个目录
   */
  move(ids: string[], targetFolderId: string): void {
    const db = getDb();
    const timestamp = nowISO();
    const stmt = db.prepare('UPDATE notes SET folder_id = ?, updated_at = ? WHERE id = ?');
    const transaction = db.transaction(() => {
      for (const id of ids) {
        stmt.run(targetFolderId, timestamp, id);
      }
    });
    transaction();
  },

  /**
   * 获取目录下的笔记数量
   */
  getCountByFolder(folderId: string): number {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM notes WHERE folder_id = ?').get(folderId) as any;
    return row?.count || 0;
  },

  /**
   * 将数据库行转换为 NoteSummary
   */
  rowToSummary(row: any): NoteSummary {
    return {
      id: row.id,
      title: row.title,
      folderId: row.folder_id,
      filePath: row.file_path,
      isPinned: row.is_pinned === 1,
      wordCount: row.word_count,
      tags: row.tag_names ? row.tag_names.split(',') : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};
