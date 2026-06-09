// src/core/database/repositories/tag-repository.ts
// 标签数据访问层

import { getDb } from '../db';
import {
  Tag,
  TagWithCount,
  NoteSummary,
  CreateTagParams,
  UpdateTagParams,
} from '../../../shared/types';
import { DEFAULT_TAG_COLOR } from '../../../shared/constants';

/** 生成 UUID */
function generateId(): string {
  return (globalThis as any).crypto?.randomUUID?.() || require('crypto').randomUUID();
}

/** 生成 ISO 时间字符串 */
function nowISO(): string {
  return new Date().toISOString();
}

/**
 * 标签数据仓库
 */
export const tagRepository = {
  /**
   * 创建标签
   */
  create(params: CreateTagParams): Tag {
    const db = getDb();
    const id = generateId();
    const timestamp = nowISO();
    const color = params.color || DEFAULT_TAG_COLOR;

    db.prepare(`
      INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)
    `).run(id, params.name, color, timestamp);

    return { id, name: params.name, color, createdAt: timestamp };
  },

  /**
   * 获取所有标签（含笔记数量）
   */
  getAll(): TagWithCount[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT t.*, COUNT(nt.note_id) as note_count
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      GROUP BY t.id
      ORDER BY t.name
    `).all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
      noteCount: row.note_count,
    }));
  },

  /**
   * 根据 ID 获取标签
   */
  getById(id: string): Tag | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
    };
  },

  /**
   * 更新标签
   */
  update(id: string, params: UpdateTagParams): Tag | null {
    const db = getDb();
    const existing = this.getById(id);
    if (!existing) return null;

    const name = params.name ?? existing.name;
    const color = params.color ?? existing.color;

    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, id);

    return { id, name, color, createdAt: existing.createdAt };
  },

  /**
   * 删除标签
   */
  delete(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  },

  /**
   * 获取某标签下的所有笔记
   */
  getNotesByTag(tagId: string): NoteSummary[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT n.*, GROUP_CONCAT(t2.name) as tag_names
      FROM notes n
      INNER JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN note_tags nt2 ON n.id = nt2.note_id
      LEFT JOIN tags t2 ON nt2.tag_id = t2.id
      WHERE nt.tag_id = ?
      GROUP BY n.id
      ORDER BY n.is_pinned DESC, n.updated_at DESC
    `).all(tagId) as any[];

    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      folderId: row.folder_id,
      filePath: row.file_path,
      isPinned: row.is_pinned === 1,
      wordCount: row.word_count,
      tags: row.tag_names ? row.tag_names.split(',') : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * 获取某笔记的所有标签
   */
  getTagsByNote(noteId: string): Tag[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT t.*
      FROM tags t
      INNER JOIN note_tags nt ON t.id = nt.tag_id
      WHERE nt.note_id = ?
      ORDER BY t.name
    `).all(noteId) as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
    }));
  },

  /**
   * 为笔记添加标签
   */
  addTagToNote(noteId: string, tagId: string): void {
    const db = getDb();
    db.prepare(`
      INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)
    `).run(noteId, tagId);
  },

  /**
   * 从笔记移除标签
   */
  removeTagFromNote(noteId: string, tagId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?').run(noteId, tagId);
  },

  /**
   * 获取标签的笔记数量
   */
  getNoteCount(tagId: string): number {
    const db = getDb();
    const row = db.prepare(
      'SELECT COUNT(*) as count FROM note_tags WHERE tag_id = ?'
    ).get(tagId) as any;
    return row?.count || 0;
  },
};
