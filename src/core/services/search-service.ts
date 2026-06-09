// src/core/services/search-service.ts
// 全文搜索服务

import { getDb } from '../database/db';
import { SearchResult, SearchOptions } from '../../shared/types';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '../database/db';
import { NOTES_DIR } from '../../shared/constants';

/**
 * 搜索服务 - 支持标题和内容全文搜索
 */
export const searchService = {
  /**
   * 全文搜索笔记（标题 + 内容）
   */
  search(keyword: string, options?: SearchOptions): SearchResult[] {
    const db = getDb();
    const limit = options?.limit || 50;
    const dataDir = getDataDir();

    let sql = `
      SELECT n.id as noteId, n.title, n.folder_id, n.file_path
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

    // 对标题匹配的笔记，读取文件内容生成摘要
    const results: SearchResult[] = [];

    for (const row of rows) {
      let snippet = '';
      let matchCount = 0;

      try {
        const filePath = path.join(dataDir, NOTES_DIR, row.file_path);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lowerContent = content.toLowerCase();
          const lowerKeyword = keyword.toLowerCase();
          const idx = lowerContent.indexOf(lowerKeyword);

          if (idx !== -1) {
            // 统计匹配次数
            let count = 0;
            let pos = 0;
            while ((pos = lowerContent.indexOf(lowerKeyword, pos)) !== -1) {
              count++;
              pos += lowerKeyword.length;
            }
            matchCount = count;

            // 提取上下文摘要
            const start = Math.max(0, idx - 40);
            const end = Math.min(content.length, idx + keyword.length + 80);
            snippet = (start > 0 ? '...' : '') +
              content.slice(start, end).replace(/\n/g, ' ') +
              (end < content.length ? '...' : '');
          }
        }
      } catch {
        // 读取失败时使用标题作为摘要
      }

      if (!snippet) {
        snippet = row.title;
      }

      results.push({
        noteId: row.noteId,
        title: row.title,
        snippet,
        matchCount,
        folderPath: row.folder_id,
      });
    }

    // 如果标题搜索结果不够，补充内容搜索
    if (results.length < 10) {
      const titleIds = new Set(results.map(r => r.noteId));
      const allNotes = db.prepare(
        'SELECT id, title, folder_id, file_path FROM notes ORDER BY updated_at DESC LIMIT 200'
      ).all() as any[];

      for (const note of allNotes) {
        if (titleIds.has(note.id)) continue;
        if (results.length >= limit) break;

        try {
          const filePath = path.join(dataDir, NOTES_DIR, note.file_path);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lowerContent = content.toLowerCase();
            const lowerKeyword = keyword.toLowerCase();
            const idx = lowerContent.indexOf(lowerKeyword);

            if (idx !== -1) {
              let count = 0;
              let pos = 0;
              while ((pos = lowerContent.indexOf(lowerKeyword, pos)) !== -1) {
                count++;
                pos += lowerKeyword.length;
              }

              const start = Math.max(0, idx - 40);
              const end = Math.min(content.length, idx + keyword.length + 80);
              const snippet = (start > 0 ? '...' : '') +
                content.slice(start, end).replace(/\n/g, ' ') +
                (end < content.length ? '...' : '');

              results.push({
                noteId: note.id,
                title: note.title,
                snippet,
                matchCount: count,
                folderPath: note.folder_id,
              });
            }
          }
        } catch {
          // skip
        }
      }
    }

    return results;
  },
};
