// src/core/services/folder-service.ts
// 目录 CRUD 服务

import { folderRepository } from '../database/repositories/folder-repository';
import {
  Folder,
  FolderTreeNode,
  CreateFolderParams,
  UpdateFolderParams,
} from '../../shared/types';

/**
 * 目录服务
 */
export const folderService = {
  /**
   * 创建目录
   */
  create(params: CreateFolderParams): Folder {
    return folderRepository.create(params);
  },

  /**
   * 获取完整目录树
   */
  getTree(): FolderTreeNode[] {
    return folderRepository.getTree();
  },

  /**
   * 根据 ID 获取目录
   */
  getById(id: string): Folder | null {
    return folderRepository.getById(id);
  },

  /**
   * 更新目录
   */
  update(id: string, params: UpdateFolderParams): Folder | null {
    return folderRepository.update(id, params);
  },

  /**
   * 删除目录（级联删除子目录和笔记）
   */
  delete(id: string): void {
    folderRepository.delete(id);
  },

  /**
   * 移动目录
   */
  move(id: string, targetParentId: string | null): void {
    folderRepository.move(id, targetParentId);
  },

  /**
   * 重排序目录
   */
  reorder(ids: string[]): void {
    folderRepository.reorder(ids);
  },

  /**
   * 获取目录路径（面包屑）
   */
  getPath(id: string): Folder[] {
    return folderRepository.getPath(id);
  },
};
