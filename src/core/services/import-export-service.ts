// src/core/services/import-export-service.ts
// 导入导出服务 - 支持 Markdown 文件导入导出（含 YAML Front Matter）

import fs from 'fs';
import path from 'path';
import { getDb, getDataDir } from '../database/db';
import { NOTES_DIR } from '../../shared/constants';
import { noteRepository } from '../database/repositories/note-repository';
import { folderRepository } from '../database/repositories/folder-repository';
import { tagRepository } from '../database/repositories/tag-repository';
import { Note } from '../../shared/types';

// ─── YAML Front Matter 解析 ─────────────────────────────────────────────────

interface FrontMatterData {
  title?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

/**
 * 解析 YAML Front Matter（简单实现，支持常见的 key: value 和 key: [array] 格式）
 */
function parseFrontMatter(content: string): { metadata: FrontMatterData; body: string } {
  const metadata: FrontMatterData = {};
  const frontMatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return { metadata, body: content };
  }

  const yamlBlock = match[1];
  const body = match[2];

  for (const line of yamlBlock.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmedLine.slice(0, colonIndex).trim();
    let value: any = trimmedLine.slice(colonIndex + 1).trim();

    // 解析数组格式 [item1, item2, ...]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1)
        .split(',')
        .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
        .filter((s: string) => s.length > 0);
    }
    // 解析引号包裹的字符串
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    metadata[key] = value;
  }

  return { metadata, body };
}

/**
 * 生成 YAML Front Matter 字符串
 */
function generateFrontMatter(note: {
  id: string;
  title: string;
  folderId: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}): string {
  const lines: string[] = [
    '---',
    `id: "${note.id}"`,
    `title: "${note.title}"`,
    `folder_id: "${note.folderId}"`,
    `tags: [${note.tags.map(t => `"${t}"`).join(', ')}]`,
    `created_at: "${note.createdAt}"`,
    `updated_at: "${note.updatedAt}"`,
    '---',
  ];
  return lines.join('\n');
}

// ─── 工具函数 ────────────────────────────────────────────────────────────────

/** 生成 UUID */
function generateId(): string {
  return (globalThis as any).crypto?.randomUUID?.() || require('crypto').randomUUID();
}

/** 从内容中提取标题：优先从 YAML front matter，其次从 # 标题，最后用文件名 */
function extractTitle(content: string, metadata: FrontMatterData, fallbackName: string): string {
  if (metadata.title) return metadata.title as string;

  // 从 Markdown 内容中查找第一个 # 标题
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  // 使用文件名（去掉扩展名）
  return fallbackName.replace(/\.md$/i, '');
}

/** 递归获取目录下所有 .md 文件 */
function getAllMdFiles(dirPath: string): string[] {
  const results: string[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMdFiles(fullPath));
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

/** 计算字数（去空白字符后长度） */
function countWords(content: string): number {
  return content.replace(/\s/g, '').length;
}

// ─── 导入导出服务 ─────────────────────────────────────────────────────────────

export const importExportService = {
  /**
   * 导入单个 .md 文件
   * @param filePath 源文件路径
   * @param folderId 目标目录 ID
   * @returns 创建的笔记
   */
  importFile(filePath: string, folderId: string): Note {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, path.extname(filePath));
    const { metadata, body } = parseFrontMatter(content);

    const title = extractTitle(body, metadata, fileName);
    const tags = (metadata.tags as string[]) || [];

    // 创建笔记
    const note = noteRepository.create({
      title,
      folderId,
      content: body,
      tags,
    });

    // 如果有标签，建立关联
    if (tags.length > 0) {
      const allTags = tagRepository.getAll();
      for (const tagName of tags) {
        const existingTag = allTags.find(t => t.name === tagName);
        if (existingTag) {
          tagRepository.addTagToNote(note.id, existingTag.id);
        }
      }
    }

    return note;
  },

  /**
   * 递归导入文件夹下所有 .md 文件
   * @param folderPath 源文件夹路径
   * @param folderId 目标目录 ID
   * @returns 导入的笔记数量
   */
  importFolder(folderPath: string, folderId: string): number {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error(`文件夹不存在: ${folderPath}`);
    }

    const mdFiles = getAllMdFiles(folderPath);
    let importedCount = 0;

    for (const filePath of mdFiles) {
      try {
        this.importFile(filePath, folderId);
        importedCount++;
      } catch (err) {
        console.error(`[ImportExport] 导入文件失败: ${filePath}`, err);
        // 继续导入其他文件，不中断
      }
    }

    return importedCount;
  },

  /**
   * 导出单个笔记为 .md 文件
   * @param noteId 笔记 ID
   * @param outputPath 输出文件路径
   * @param options 选项
   * @returns 输出文件路径
   */
  exportNote(
    noteId: string,
    outputPath: string,
    options?: { includeFrontMatter?: boolean }
  ): string {
    const noteDetail = noteRepository.getById(noteId);
    if (!noteDetail) {
      throw new Error(`笔记不存在: ${noteId}`);
    }

    const includeFrontMatter = options?.includeFrontMatter !== false; // 默认包含
    let output = '';

    if (includeFrontMatter) {
      const frontMatter = generateFrontMatter({
        id: noteDetail.id,
        title: noteDetail.title,
        folderId: noteDetail.folderId,
        tags: noteDetail.tags,
        createdAt: noteDetail.createdAt,
        updatedAt: noteDetail.updatedAt,
      });
      output = frontMatter + '\n\n' + noteDetail.content;
    } else {
      output = noteDetail.content;
    }

    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, output, 'utf-8');
    return outputPath;
  },

  /**
   * 导出目录下所有笔记为 .md 文件
   * @param folderId 目录 ID
   * @param outputPath 输出文件夹路径
   * @param options 选项
   * @returns 导出的笔记数量
   */
  exportFolder(
    folderId: string,
    outputPath: string,
    options?: { includeFrontMatter?: boolean }
  ): number {
    const db = getDb();

    // 获取目录下所有笔记
    const rows = db.prepare(
      'SELECT id, title, file_path FROM notes WHERE folder_id = ? ORDER BY title'
    ).all(folderId) as any[];

    if (rows.length === 0) {
      return 0;
    }

    // 确保输出目录存在
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    let exportedCount = 0;

    for (const row of rows) {
      try {
        // 使用笔记标题作为文件名，处理非法字符
        const safeFileName = row.title
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, ' ')
          .trim() || row.id;
        const filePath = path.join(outputPath, `${safeFileName}.md`);

        this.exportNote(row.id, filePath, options);
        exportedCount++;
      } catch (err) {
        console.error(`[ImportExport] 导出笔记失败: ${row.id}`, err);
      }
    }

    return exportedCount;
  },
};
