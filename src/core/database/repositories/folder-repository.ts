// src/core/database/repositories/folder-repository.ts
// 目录数据访问层

import { getDb } from '../db';
import {
  Folder,
  FolderTreeNode,
  CreateFolderParams,
  UpdateFolderParams,
} from '../../../shared/types';

/** 生成 UUID */
function generateId(): string {
  return (globalThis as any).crypto?.randomUUID?.() || require('crypto').randomUUID();
}

/** 生成 ISO 时间字符串 */
function nowISO(): string {
  return new Date().toISOString();
}

/**
 * 目录数据仓库
 */
export const folderRepository = {
  /**
   * 创建目录
   */
  create(params: CreateFolderParams): Folder {
    const db = getDb();
    const id = generateId();
    const timestamp = nowISO();
    const parentId = params.parentId || null;

    // 获取当前最大排序号
    const maxRow = db.prepare(
      'SELECT MAX(sort_order) as max_order FROM folders WHERE parent_id IS ?'
    ).get(parentId) as any;
    const sortOrder = (maxRow?.max_order || 0) + 1;

    db.prepare(`
      INSERT INTO folders (id, name, parent_id, sort_order, icon, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'folder', ?, ?)
    `).run(id, params.name, parentId, sortOrder, timestamp, timestamp);

    return {
      id,
      name: params.name,
      parentId,
      sortOrder,
      icon: 'folder',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  /**
   * 获取完整目录树（递归查询）
   */
  getTree(): FolderTreeNode[] {
    const db = getDb();

    // 获取所有目录
    const folders = db.prepare(`
      SELECT id, name, parent_id, sort_order, icon, created_at, updated_at
      FROM folders ORDER BY sort_order
    `).all() as any[];

    // 获取每个目录的笔记数量
    const noteCounts = db.prepare(`
      SELECT folder_id, COUNT(*) as count FROM notes GROUP BY folder_id
    `).all() as any[];

    const countMap = new Map<string, number>();
    for (const nc of noteCounts) {
      countMap.set(nc.folder_id, nc.count);
    }

    // 构建树
    const map = new Map<string, FolderTreeNode>();
    const roots: FolderTreeNode[] = [];

    // 第一遍：创建所有节点
    for (const f of folders) {
      map.set(f.id, {
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        sortOrder: f.sort_order,
        icon: f.icon,
        children: [],
        noteCount: countMap.get(f.id) || 0,
      });
    }

    // 第二遍：建立父子关系
    for (const f of folders) {
      const node = map.get(f.id)!;
      if (f.parent_id && map.has(f.parent_id)) {
        map.get(f.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  },

  /**
   * 根据 ID 获取目录
   */
  getById(id: string): Folder | null {
    const db = getDb();
    const row = db.prepare(
      'SELECT * FROM folders WHERE id = ?'
    ).get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      sortOrder: row.sort_order,
      icon: row.icon,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * 更新目录
   */
  update(id: string, params: UpdateFolderParams): Folder | null {
    const db = getDb();
    const existing = this.getById(id);
    if (!existing) return null;

    const timestamp = nowISO();
    const name = params.name ?? existing.name;
    const icon = params.icon ?? existing.icon;

    db.prepare(`
      UPDATE folders SET name = ?, icon = ?, updated_at = ? WHERE id = ?
    `).run(name, icon, timestamp, id);

    return {
      id,
      name,
      parentId: existing.parentId,
      sortOrder: existing.sortOrder,
      icon,
      createdAt: existing.createdAt,
      updatedAt: timestamp,
    };
  },

  /**
   * 删除目录（级联删除子目录和笔记，由外键约束处理）
   */
  delete(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  },

  /**
   * 移动目录到新的父目录
   */
  move(id: string, targetParentId: string | null): void {
    const db = getDb();
    const timestamp = nowISO();

    // 获取目标位置最大排序号
    const maxRow = db.prepare(
      'SELECT MAX(sort_order) as max_order FROM folders WHERE parent_id IS ?'
    ).get(targetParentId) as any;
    const sortOrder = (maxRow?.max_order || 0) + 1;

    db.prepare(`
      UPDATE folders SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ?
    `).run(targetParentId, sortOrder, timestamp, id);
  },

  /**
   * 重排序目录
   */
  reorder(ids: string[]): void {
    const db = getDb();
    const timestamp = nowISO();
    const stmt = db.prepare('UPDATE folders SET sort_order = ?, updated_at = ? WHERE id = ?');
    const transaction = db.transaction(() => {
      for (let i = 0; i < ids.length; i++) {
        stmt.run(i + 1, timestamp, ids[i]);
      }
    });
    transaction();
  },

  /**
   * 获取目录路径（面包屑用）
   */
  getPath(id: string): Folder[] {
    const db = getDb();
    const pathArr: Folder[] = [];
    let currentId: string | null = id;

    while (currentId) {
      const row = db.prepare('SELECT * FROM folders WHERE id = ?').get(currentId) as any;
      if (!row) break;
      pathArr.unshift({
        id: row.id,
        name: row.name,
        parentId: row.parent_id,
        sortOrder: row.sort_order,
        icon: row.icon,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
      currentId = row.parent_id;
    }

    return pathArr;
  },
};
