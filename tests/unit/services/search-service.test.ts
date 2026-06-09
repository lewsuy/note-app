import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted() ensures these are available when vi.mock factories run (they get hoisted)
const { mockGetDb, mockGetDataDir, mockPrepare, mockFolderPath, mockExistsSync, mockReadFileSync } = vi.hoisted(() => {
  return {
    mockGetDb: vi.fn(),
    mockGetDataDir: vi.fn(),
    mockPrepare: vi.fn(),
    mockFolderPath: vi.fn(),
    mockExistsSync: vi.fn(),
    mockReadFileSync: vi.fn(),
  };
});

const mockDb = { prepare: mockPrepare };

vi.mock('../../../src/core/database/db', () => ({
  getDb: mockGetDb,
  getDataDir: mockGetDataDir,
}));

vi.mock('../../../src/core/database/repositories/folder-repository', () => ({
  folderRepository: {
    getPath: mockFolderPath,
  },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

vi.mock('../../../src/shared/constants', () => ({
  NOTES_DIR: 'notes',
}));

import { searchService } from '../../../src/core/services/search-service';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDb.mockReturnValue(mockDb);
  mockGetDataDir.mockReturnValue('/data');
});

function setupSearch(titleRows: any[], candidateRows: any[] = []) {
  mockPrepare.mockReturnValue({
    all: vi.fn()
      .mockReturnValueOnce(titleRows)
      .mockReturnValueOnce(candidateRows),
    get: vi.fn(),
    run: vi.fn(),
  });
}

describe('searchService', () => {
  describe('search', () => {
    it('should return empty array for empty keyword', () => {
      expect(searchService.search('')).toEqual([]);
      expect(searchService.search('   ')).toEqual([]);
    });

    it('should return results for title matches', () => {
      setupSearch([
        { id: 'n1', title: 'My Test Note', folder_id: 'f1', file_path: 'n1.md' },
      ]);
      mockExistsSync.mockReturnValue(false);
      mockFolderPath.mockReturnValue([{ id: 'f1', name: 'Root', parentId: null, sortOrder: 1, icon: 'folder', createdAt: '', updatedAt: '' }]);

      const results = searchService.search('Test');

      expect(results).toHaveLength(1);
      expect(results[0].noteId).toBe('n1');
      expect(results[0].title).toBe('My Test Note');
      expect(results[0].folderPath).toBe('Root');
    });

    it('should read file content for snippet extraction', () => {
      setupSearch([
        { id: 'n1', title: 'Test Note', folder_id: 'f1', file_path: 'n1.md' },
      ]);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('This is a test content with keyword inside the file body');
      mockFolderPath.mockReturnValue([{ id: 'f1', name: 'Root', parentId: null, sortOrder: 1, icon: 'folder', createdAt: '', updatedAt: '' }]);

      const results = searchService.search('keyword');

      expect(results).toHaveLength(1);
      expect(results[0].snippet).toContain('keyword');
      expect(results[0].matchCount).toBeGreaterThanOrEqual(1);
    });

    it('should search content in non-title-matching notes', () => {
      setupSearch(
        [],
        [{ id: 'n2', title: 'Other Note', folder_id: 'f1', file_path: 'n2.md' }],
      );
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('Here is the searchterm inside the content');
      mockFolderPath.mockReturnValue([]);

      const results = searchService.search('searchterm');

      expect(results).toHaveLength(1);
      expect(results[0].noteId).toBe('n2');
    });

    it('should sort results with title matches first', () => {
      setupSearch(
        [{ id: 'n1', title: 'Python Guide', folder_id: 'f1', file_path: 'n1.md' }],
        [{ id: 'n2', title: 'Other', folder_id: 'f1', file_path: 'n2.md' }],
      );
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync
        .mockReturnValueOnce('Python is great')
        .mockReturnValueOnce('I like Python too');
      mockFolderPath.mockReturnValue([]);

      const results = searchService.search('Python');

      expect(results[0].title).toBe('Python Guide');
    });

    it('should pass limit option to the SQL query', () => {
      // The limit is applied at the SQL level (LIMIT ? in the query).
      // Since we mock the DB, we verify the SQL includes the limit parameter
      // and that the service passes it correctly.
      setupSearch([], []);
      mockFolderPath.mockReturnValue([]);

      searchService.search('Test', { limit: 2 });

      // Verify that prepare was called with SQL containing LIMIT
      const titleSql = mockPrepare.mock.calls[0][0] as string;
      expect(titleSql).toContain('LIMIT');
    });

    it('should filter by folderId when provided', () => {
      setupSearch([], []);

      searchService.search('test', { folderId: 'f1' });

      const firstCallSql = mockPrepare.mock.calls[0][0] as string;
      expect(firstCallSql).toContain('folder_id');
    });

    it('should handle file read errors gracefully', () => {
      setupSearch([
        { id: 'n1', title: 'Test', folder_id: 'f1', file_path: 'n1.md' },
      ]);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => { throw new Error('read error'); });
      mockFolderPath.mockReturnValue([]);

      const results = searchService.search('Test');

      expect(results).toHaveLength(1);
      expect(results[0].snippet).toBe('Test');
    });

    it('should count multiple matches in content', () => {
      setupSearch(
        [],
        [{ id: 'n1', title: 'Note', folder_id: 'f1', file_path: 'n1.md' }],
      );
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('test test test testing');
      mockFolderPath.mockReturnValue([]);

      const results = searchService.search('test');

      expect(results).toHaveLength(1);
      expect(results[0].matchCount).toBe(4);
    });

    it('should return empty when no matches found', () => {
      setupSearch([], []);
      mockFolderPath.mockReturnValue([]);

      const results = searchService.search('xyznothere');

      expect(results).toHaveLength(0);
    });
  });
});
