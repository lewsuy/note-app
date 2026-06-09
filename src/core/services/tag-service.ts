// src/core/services/tag-service.ts
// 标签 CRUD 服务 - 封装业务逻辑

import { tagRepository } from '../database/repositories/tag-repository';
import {
  Tag,
  TagWithCount,
  NoteSummary,
  CreateTagParams,
  UpdateTagParams,
} from '../../shared/types';

/**
 * 标签服务
 */
export const tagService = {
  /**
   * 创建标签
   */
  create(params: CreateTagParams): Tag {
    return tagRepository.create(params);
  },

  /**
   * 获取所有标签（含笔记数量）
   */
  getAll(): TagWithCount[] {
    return tagRepository.getAll();
  },

  /**
   * 根据 ID 获取标签
   */
  getById(id: string): Tag | null {
    return tagRepository.getById(id);
  },

  /**
   * 更新标签
   */
  update(id: string, params: UpdateTagParams): Tag | null {
    return tagRepository.update(id, params);
  },

  /**
   * 删除标签
   */
  delete(id: string): void {
    tagRepository.delete(id);
  },

  /**
   * 获取某标签下的所有笔记
   */
  getNotesByTag(tagId: string): NoteSummary[] {
    return tagRepository.getNotesByTag(tagId);
  },

  /**
   * 获取某笔记的所有标签
   */
  getTagsByNote(noteId: string): Tag[] {
    return tagRepository.getTagsByNote(noteId);
  },

  /**
   * 为笔记添加标签
   */
  addTagToNote(noteId: string, tagId: string): void {
    tagRepository.addTagToNote(noteId, tagId);
  },

  /**
   * 从笔记移除标签
   */
  removeTagFromNote(noteId: string, tagId: string): void {
    tagRepository.removeTagFromNote(noteId, tagId);
  },
};
