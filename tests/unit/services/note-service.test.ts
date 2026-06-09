import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database modules before importing the service
vi.mock('../../../src/core/database/repositories/note-repository', () => ({
  noteRepository: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    getByFolder: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    move: vi.fn(),
  },
}));

vi.mock('../../../src/core/database/repositories/tag-repository', () => ({
  tagRepository: {
    getAll: vi.fn(),
    addTagToNote: vi.fn(),
  },
}));

vi.mock('../../../src/core/services/search-service', () => ({
  searchService: {
    search: vi.fn(),
  },
}));

import { noteService } from '../../../src/core/services/note-service';
import { noteRepository } from '../../../src/core/database/repositories/note-repository';
import { tagRepository } from '../../../src/core/database/repositories/tag-repository';
import { searchService } from '../../../src/core/services/search-service';

const mockRepo = vi.mocked(noteRepository);
const mockTagRepo = vi.mocked(tagRepository);
const mockSearch = vi.mocked(searchService);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('noteService', () => {
  describe('create', () => {
    it('should create a note via repository', () => {
      const params = { title: 'Test Note', folderId: 'folder-1', content: 'Hello world' };
      const expectedNote = {
        id: 'note-1',
        title: 'Test Note',
        folderId: 'folder-1',
        filePath: 'note-1.md',
        isPinned: false,
        wordCount: 10,
        tags: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };
      mockRepo.create.mockReturnValue(expectedNote);

      const result = noteService.create(params);

      expect(mockRepo.create).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedNote);
    });

    it('should associate existing tags when creating a note', () => {
      const params = { title: 'Tagged Note', folderId: 'f1', tags: ['work', 'important'] };
      const createdNote = {
        id: 'note-2',
        title: 'Tagged Note',
        folderId: 'f1',
        filePath: 'note-2.md',
        isPinned: false,
        wordCount: 0,
        tags: ['work', 'important'],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };
      mockRepo.create.mockReturnValue(createdNote);
      mockTagRepo.getAll.mockReturnValue([
        { id: 'tag-1', name: 'work', color: '#409EFF', createdAt: '', noteCount: 0 },
        { id: 'tag-2', name: 'important', color: '#F56C6C', createdAt: '', noteCount: 0 },
      ]);

      const result = noteService.create(params);

      expect(mockTagRepo.addTagToNote).toHaveBeenCalledWith('note-2', 'tag-1');
      expect(mockTagRepo.addTagToNote).toHaveBeenCalledWith('note-2', 'tag-2');
      expect(result).toEqual(createdNote);
    });

    it('should skip tags that do not exist', () => {
      const params = { title: 'Note', folderId: 'f1', tags: ['nonexistent'] };
      mockRepo.create.mockReturnValue({
        id: 'note-3', title: 'Note', folderId: 'f1', filePath: 'n.md',
        isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
      });
      mockTagRepo.getAll.mockReturnValue([]);

      noteService.create(params);

      expect(mockTagRepo.addTagToNote).not.toHaveBeenCalled();
    });

    it('should not attempt tag association when tags array is empty', () => {
      const params = { title: 'Note', folderId: 'f1', tags: [] };
      mockRepo.create.mockReturnValue({
        id: 'note-4', title: 'Note', folderId: 'f1', filePath: 'n.md',
        isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
      });

      noteService.create(params);

      expect(mockTagRepo.getAll).not.toHaveBeenCalled();
      expect(mockTagRepo.addTagToNote).not.toHaveBeenCalled();
    });

    it('should not attempt tag association when tags is undefined', () => {
      const params = { title: 'Note', folderId: 'f1' };
      mockRepo.create.mockReturnValue({
        id: 'note-5', title: 'Note', folderId: 'f1', filePath: 'n.md',
        isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
      });

      noteService.create(params);

      expect(mockTagRepo.getAll).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return note detail when found', () => {
      const detail = {
        id: 'note-1', title: 'My Note', folderId: 'f1', filePath: 'note-1.md',
        isPinned: false, wordCount: 5, tags: ['work'], createdAt: '', updatedAt: '',
        content: '# My Note\nHello',
      };
      mockRepo.getById.mockReturnValue(detail);

      const result = noteService.getById('note-1');

      expect(mockRepo.getById).toHaveBeenCalledWith('note-1');
      expect(result).toEqual(detail);
    });

    it('should return null when note not found', () => {
      mockRepo.getById.mockReturnValue(null);

      const result = noteService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return list of note summaries', () => {
      const summaries = [
        { id: 'n1', title: 'A', folderId: 'f1', filePath: 'a.md', isPinned: false, wordCount: 1, tags: [], createdAt: '', updatedAt: '' },
        { id: 'n2', title: 'B', folderId: 'f1', filePath: 'b.md', isPinned: false, wordCount: 2, tags: [], createdAt: '', updatedAt: '' },
      ];
      mockRepo.getAll.mockReturnValue(summaries);

      const result = noteService.getAll();

      expect(mockRepo.getAll).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(2);
    });

    it('should pass options to repository', () => {
      mockRepo.getAll.mockReturnValue([]);
      const opts = { sortBy: 'title' as const, sortOrder: 'asc' as const, limit: 10 };

      noteService.getAll(opts);

      expect(mockRepo.getAll).toHaveBeenCalledWith(opts);
    });
  });

  describe('getByFolder', () => {
    it('should return notes for a folder', () => {
      mockRepo.getByFolder.mockReturnValue([]);

      noteService.getByFolder('folder-1');

      expect(mockRepo.getByFolder).toHaveBeenCalledWith('folder-1');
    });
  });

  describe('update', () => {
    it('should update note and return updated result', () => {
      const updated = {
        id: 'n1', title: 'Updated', folderId: 'f1', filePath: 'n1.md',
        isPinned: false, wordCount: 7, tags: [], createdAt: '', updatedAt: '2025-06-01T00:00:00Z',
      };
      mockRepo.update.mockReturnValue(updated);

      const result = noteService.update('n1', { title: 'Updated' });

      expect(mockRepo.update).toHaveBeenCalledWith('n1', { title: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('should return null when updating nonexistent note', () => {
      mockRepo.update.mockReturnValue(null);

      const result = noteService.update('bad-id', { title: 'X' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete note via repository', () => {
      noteService.delete('note-1');

      expect(mockRepo.delete).toHaveBeenCalledWith('note-1');
    });
  });

  describe('move', () => {
    it('should move notes to target folder', () => {
      noteService.move(['n1', 'n2'], 'folder-2');

      expect(mockRepo.move).toHaveBeenCalledWith(['n1', 'n2'], 'folder-2');
    });
  });

  describe('search', () => {
    it('should delegate search to searchService', () => {
      const results = [
        { noteId: 'n1', title: 'Result', snippet: '...match...', matchCount: 2, folderPath: 'Root' },
      ];
      mockSearch.search.mockReturnValue(results);

      const result = noteService.search('match', { folderId: 'f1' });

      expect(mockSearch.search).toHaveBeenCalledWith('match', { folderId: 'f1' });
      expect(result).toEqual(results);
    });
  });
});
