// src/core/services/search-service.ts
// 全文搜索服务 - 支持标题和内容搜索，返回匹配摘要和目录路径

import { getDb } from '../database/db';
import { SearchResult, SearchOptions } from '../../shared/types';
import { folderRepository } from '../database/repositories/folder-repository';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '../database/db';
import { NOTES_DIR } from '../../shared/constants';

/**
 * 获取目录的完整路径字符串（如 "工作 / 会议记录 / 项目A"）
 */
function getFolderPath(folderId: string): string {
  try {
    const pathArr = folderRepository.getPath(folderId);
    if (pathArr.length === 0) return '';
    return pathArr.map(f => f.name).join(' / ');
  } catch {
    return folderId;
  }
}

/**
 * 从内容中提取匹配关键词的摘要
 * 返回包含关键词上下文的文本片段
 */
function extractSnippet(content: string, keyword: string): { snippet: string; matchCount: number } {
  const lowerContent = content.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // 统计匹配次数
  let matchCount = 0;
  let pos = 0;
  while ((pos = lowerContent.indexOf(lowerKeyword, pos)) !== -1) {
    matchCount++;
    pos += lowerKeyword.length;
  }

  if (matchCount === 0) {
    return { snippet: '', matchCount: 0 };
  }

  // 找到第一个匹配位置，提取上下文
  const firstIdx = lowerContent.indexOf(lowerKeyword);
  const snippetRadius = 60; // 关键词前后各取的字符数
  const start = Math.max(0, firstIdx - snippetRadius);
  const end = Math.min(content.length, firstIdx + keyword.length + snippetRadius);

  let snippet = content.slice(start, end).replace(/\n/g, ' ').trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  return { snippet, matchCount };
}

/**
 * 搜索服务 - 支持标题和内容全文搜索
 */
export const searchService = {
  /**
   * 全文搜索笔记（标题 + 内容）
   * 使用 SQL LIKE 搜索标题，再扫描文件内容搜索正文
   * 返回结果包含标题、匹配摘要、匹配次数、目录路径
   */
  search(keyword: string, options?: SearchOptions): SearchResult[] {
    if (!keyword || keyword.trim().length === 0) {
      return [];
    }

    const db = getDb();
    const limit = options?.limit || 50;
    const dataDir = getDataDir();
    const trimmedKeyword = keyword.trim();

    // 第一步：搜索标题匹配的笔记
    let titleSql = `
      SELECT n.id, n.title, n.folder_id, n.file_path
      FROM notes n
      WHERE n.title LIKE ?
    `;
    const titleParams: any[] = [`%${trimmedKeyword}%`];

    if (options?.folderId) {
      titleSql += ' AND n.folder_id = ?';
      titleParams.push(options.folderId);
    }

    // 按标签筛选
    if (options?.tagIds && options.tagIds.length > 0) {
      const placeholders = options.tagIds.map(() => '?').join(',');
      titleSql += ` AND n.id IN (SELECT note_id FROM note_tags WHERE tag_id IN (${placeholders}))`;
      titleParams.push(...options.tagIds);
    }

    titleSql += ' ORDER BY n.updated_at DESC LIMIT ?';
    titleParams.push(limit);

    const titleRows = db.prepare(titleSql).all(...titleParams) as any[];

    const results: SearchResult[] = [];
    const processedIds = new Set<string>();

    // 处理标题匹配的结果
    for (const row of titleRows) {
      processedIds.add(row.id);

      let snippet = '';
      let matchCount = 0;

      // 读取文件内容，统计内容中的匹配
      try {
        const filePath = path.join(dataDir, NOTES_DIR, row.file_path);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const contentResult = extractSnippet(content, trimmedKeyword);
          matchCount = contentResult.matchCount;
          snippet = contentResult.snippet;
        }
      } catch {
        // 读取失败时用标题作为摘要
      }

      // 标题本身也算一次匹配
      const titleMatchCount = matchCount > 0 ? matchCount : 1;

      if (!snippet) {
        snippet = row.title;
      }

      results.push({
        noteId: row.id,
        title: row.title,
        snippet,
        matchCount: titleMatchCount,
        folderPath: getFolderPath(row.folder_id),
      });
    }

    // 第二步：如果还有余量，搜索内容中包含关键词的笔记
    if (results.length < limit) {
      // 获取候选笔记（排除已处理的）
      let candidateSql = `
        SELECT n.id, n.title, n.folder_id, n.file_path
        FROM notes n
        WHERE n.title NOT LIKE ?
      `;
      const candidateParams: any[] = [`%${trimmedKeyword}%`];

      if (options?.folderId) {
        candidateSql += ' AND n.folder_id = ?';
        candidateParams.push(options.folderId);
      }

      if (options?.tagIds && options.tagIds.length > 0) {
        const placeholders = options.tagIds.map(() => '?').join(',');
        candidateSql += ` AND n.id IN (SELECT note_id FROM note_tags WHERE tag_id IN (${placeholders}))`;
        candidateParams.push(...options.tagIds);
      }

      // 多取一些候选，因为内容匹配需要文件扫描
      candidateSql += ' ORDER BY n.updated_at DESC LIMIT 200';

      const candidateRows = db.prepare(candidateSql).all(...candidateParams) as any[];

      for (const row of candidateRows) {
        if (processedIds.has(row.id)) continue;
        if (results.length >= limit) break;

        try {
          const filePath = path.join(dataDir, NOTES_DIR, row.file_path);
          if (!fs.existsSync(filePath)) continue;

          const content = fs.readFileSync(filePath, 'utf-8');
          const { snippet, matchCount } = extractSnippet(content, trimmedKeyword);

          if (matchCount > 0) {
            processedIds.add(row.id);
            results.push({
              noteId: row.id,
              title: row.title,
              snippet,
              matchCount,
              folderPath: getFolderPath(row.folder_id),
            });
          }
        } catch {
          // 跳过读取失败的文件
        }
      }
    }

    // 按匹配数量排序（匹配多的排前面），然后按相关性
    results.sort((a, b) => {
      // 标题完全匹配的优先
      const aTitleMatch = a.title.toLowerCase().includes(trimmedKeyword.toLowerCase()) ? 1 : 0;
      const bTitleMatch = b.title.toLowerCase().includes(trimmedKeyword.toLowerCase()) ? 1 : 0;
      if (aTitleMatch !== bTitleMatch) return bTitleMatch - aTitleMatch;

      // 然后按匹配数量排序
      return b.matchCount - a.matchCount;
    });

    return results;
  },
};
