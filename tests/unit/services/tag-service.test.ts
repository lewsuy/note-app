import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/core/database/repositories/tag-repository', () => ({
  tagRepository: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getNotesByTag: vi.fn(),
    getTagsByNote: vi.fn(),
    addTagToNote: vi.fn(),
    removeTagFromNote: vi.fn(),
  },
}));

import { tagService } from '../../../src/core/services/tag-service';
import { tagRepository } from '../../../src/core/database/repositories/tag-repository';

const mockRepo = vi.mocked(tagRepository);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tagService', () => {
  describe('create', () => {
    it('should create a tag and return it', () => {
      const params = { name: 'work' };
      const expected = { id: 'tag-1', name: 'work', color: '#409EFF', createdAt: '2025-01-01T00:00:00Z' };
      mockRepo.create.mockReturnValue(expected);

      const result = tagService.create(params);

      expect(mockRepo.create).toHaveBeenCalledWith(params);
      expect(result).toEqual(expected);
    });

    it('should create a tag with custom color', () => {
      const params = { name: 'urgent', color: '#F56C6C' };
      const expected = { id: 'tag-2', name: 'urgent', color: '#F56C6C', createdAt: '' };
      mockRepo.create.mockReturnValue(expected);

      const result = tagService.create(params);

      expect(result.color).toBe('#F56C6C');
    });
  });

  describe('getAll', () => {
    it('should return all tags with note counts', () => {
      const tags = [
        { id: 'tag-1', name: 'work', color: '#409EFF', createdAt: '', noteCount: 5 },
        { id: 'tag-2', name: 'personal', color: '#67C23A', createdAt: '', noteCount: 3 },
      ];
      mockRepo.getAll.mockReturnValue(tags);

      const result = tagService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].noteCount).toBe(5);
    });
  });

  describe('getById', () => {
    it('should return tag when found', () => {
      const tag = { id: 'tag-1', name: 'work', color: '#409EFF', createdAt: '' };
      mockRepo.getById.mockReturnValue(tag);

      const result = tagService.getById('tag-1');

      expect(result).toEqual(tag);
    });

    it('should return null when not found', () => {
      mockRepo.getById.mockReturnValue(null);

      const result = tagService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update tag name', () => {
      const updated = { id: 'tag-1', name: 'renamed', color: '#409EFF', createdAt: '' };
      mockRepo.update.mockReturnValue(updated);

      const result = tagService.update('tag-1', { name: 'renamed' });

      expect(mockRepo.update).toHaveBeenCalledWith('tag-1', { name: 'renamed' });
      expect(result!.name).toBe('renamed');
    });

    it('should update tag color', () => {
      const updated = { id: 'tag-1', name: 'work', color: '#F56C6C', createdAt: '' };
      mockRepo.update.mockReturnValue(updated);

      const result = tagService.update('tag-1', { color: '#F56C6C' });

      expect(result!.color).toBe('#F56C6C');
    });

    it('should return null for nonexistent tag', () => {
      mockRepo.update.mockReturnValue(null);

      const result = tagService.update('bad', { name: 'X' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete tag via repository', () => {
      tagService.delete('tag-1');

      expect(mockRepo.delete).toHaveBeenCalledWith('tag-1');
    });
  });

  describe('getNotesByTag', () => {
    it('should return notes for a tag', () => {
      const notes = [
        { id: 'n1', title: 'Note 1', folderId: 'f1', filePath: 'n1.md', isPinned: false, wordCount: 10, tags: ['work'], createdAt: '', updatedAt: '' },
      ];
      mockRepo.getNotesByTag.mockReturnValue(notes);

      const result = tagService.getNotesByTag('tag-1');

      expect(mockRepo.getNotesByTag).toHaveBeenCalledWith('tag-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getTagsByNote', () => {
    it('should return tags for a note', () => {
      const tags = [
        { id: 'tag-1', name: 'work', color: '#409EFF', createdAt: '' },
        { id: 'tag-2', name: 'important', color: '#F56C6C', createdAt: '' },
      ];
      mockRepo.getTagsByNote.mockReturnValue(tags);

      const result = tagService.getTagsByNote('note-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('addTagToNote', () => {
    it('should add tag to note', () => {
      tagService.addTagToNote('note-1', 'tag-1');

      expect(mockRepo.addTagToNote).toHaveBeenCalledWith('note-1', 'tag-1');
    });
  });

  describe('removeTagFromNote', () => {
    it('should remove tag from note', () => {
      tagService.removeTagFromNote('note-1', 'tag-1');

      expect(mockRepo.removeTagFromNote).toHaveBeenCalledWith('note-1', 'tag-1');
    });
  });
});
