import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/core/database/db', () => ({
  getDb: vi.fn(),
  getDataDir: vi.fn(() => '/data'),
}));

vi.mock('../../../src/core/database/repositories/note-repository', () => ({
  noteRepository: {
    create: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('../../../src/core/database/repositories/folder-repository', () => ({
  folderRepository: {},
}));

vi.mock('../../../src/core/database/repositories/tag-repository', () => ({
  tagRepository: {
    getAll: vi.fn(),
    addTagToNote: vi.fn(),
  },
}));

vi.mock('../../../src/shared/constants', () => ({
  NOTES_DIR: 'notes',
  DEFAULT_TAG_COLOR: '#409EFF',
}));

const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockStatSync = vi.fn();
const mockReaddirSync = vi.fn();

vi.mock('fs', () => ({
  default: {
    existsSync: (...args: any[]) => mockExistsSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
    writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
    mkdirSync: (...args: any[]) => mockMkdirSync(...args),
    statSync: (...args: any[]) => mockStatSync(...args),
    readdirSync: (...args: any[]) => mockReaddirSync(...args),
  },
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
  mkdirSync: (...args: any[]) => mockMkdirSync(...args),
  statSync: (...args: any[]) => mockStatSync(...args),
  readdirSync: (...args: any[]) => mockReaddirSync(...args),
}));

import { importExportService } from '../../../src/core/services/import-export-service';
import { noteRepository } from '../../../src/core/database/repositories/note-repository';
import { tagRepository } from '../../../src/core/database/repositories/tag-repository';
import { getDb } from '../../../src/core/database/db';

const mockNoteRepo = vi.mocked(noteRepository);
const mockTagRepo = vi.mocked(tagRepository);
const mockGetDb = vi.mocked(getDb);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('importExportService', () => {
  describe('importFile', () => {
    it('should import a simple markdown file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('# Hello World\n\nThis is content.');
      mockNoteRepo.create.mockReturnValue({
        id: 'note-1', title: 'Hello World', folderId: 'f1', filePath: 'note-1.md',
        isPinned: false, wordCount: 15, tags: [], createdAt: '2025-01-01', updatedAt: '2025-01-01',
      });
      mockTagRepo.getAll.mockReturnValue([]);

      const result = importExportService.importFile('/path/to/file.md', 'f1');

      expect(mockNoteRepo.create).toHaveBeenCalledWith({
        title: 'Hello World',
        folderId: 'f1',
        content: '# Hello World\n\nThis is content.',
        tags: [],
      });
      expect(result.id).toBe('note-1');
    });

    it('should parse YAML front matter for title and tags', () => {
      const content = '---\ntitle: "My Title"\ntags: [work, important]\n---\n\nBody content here.';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(content);
      mockNoteRepo.create.mockReturnValue({
        id: 'note-2', title: 'My Title', folderId: 'f1', filePath: 'n.md',
        isPinned: false, wordCount: 10, tags: ['work', 'important'], createdAt: '', updatedAt: '',
      });
      mockTagRepo.getAll.mockReturnValue([
        { id: 'tag-1', name: 'work', color: '#409EFF', createdAt: '', noteCount: 0 },
        { id: 'tag-2', name: 'important', color: '#F56C6C', createdAt: '', noteCount: 0 },
      ]);

      const result = importExportService.importFile('/path/to/file.md', 'f1');

      expect(mockNoteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Title', tags: ['work', 'important'] }),
      );
      expect(mockTagRepo.addTagToNote).toHaveBeenCalledWith('note-2', 'tag-1');
      expect(mockTagRepo.addTagToNote).toHaveBeenCalledWith('note-2', 'tag-2');
    });

    it('should use filename as title fallback when no heading', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('Just plain text, no heading.');
      mockNoteRepo.create.mockReturnValue({
        id: 'n1', title: 'my-document', folderId: 'f1', filePath: 'n.md',
        isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
      });
      mockTagRepo.getAll.mockReturnValue([]);

      importExportService.importFile('/path/to/my-document.md', 'f1');

      expect(mockNoteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'my-document' }),
      );
    });

    it('should throw error when file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => importExportService.importFile('/no/file.md', 'f1')).toThrow('文件不存在');
    });

    it('should skip tag association when tag does not exist', () => {
      const content = '---\ntags: [nonexistent]\n---\n\nBody.';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(content);
      mockNoteRepo.create.mockReturnValue({
        id: 'n1', title: 'Note', folderId: 'f1', filePath: 'n.md',
        isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
      });
      mockTagRepo.getAll.mockReturnValue([]);

      importExportService.importFile('/path/file.md', 'f1');

      expect(mockTagRepo.addTagToNote).not.toHaveBeenCalled();
    });
  });

  describe('importFolder', () => {
    it('should import all markdown files in a folder', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isDirectory: () => true });
      mockReaddirSync.mockReturnValue([
        { name: 'file1.md', isFile: () => true, isDirectory: () => false },
        { name: 'file2.md', isFile: () => true, isDirectory: () => false },
        { name: 'other.txt', isFile: () => true, isDirectory: () => false },
      ]);
      mockReadFileSync
        .mockReturnValueOnce('# File 1\nContent 1')
        .mockReturnValueOnce('# File 2\nContent 2');
      mockNoteRepo.create
        .mockReturnValueOnce({
          id: 'n1', title: 'File 1', folderId: 'f1', filePath: 'n1.md',
          isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
        })
        .mockReturnValueOnce({
          id: 'n2', title: 'File 2', folderId: 'f1', filePath: 'n2.md',
          isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
        });
      mockTagRepo.getAll.mockReturnValue([]);

      const count = importExportService.importFolder('/some/folder', 'f1');

      expect(count).toBe(2);
    });

    it('should throw when folder does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => importExportService.importFolder('/no/folder', 'f1')).toThrow('文件夹不存在');
    });

    it('should continue importing when a file fails', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isDirectory: () => true });
      mockReaddirSync.mockReturnValue([
        { name: 'bad.md', isFile: () => true, isDirectory: () => false },
        { name: 'good.md', isFile: () => true, isDirectory: () => false },
      ]);
      // First file read throws
      mockReadFileSync
        .mockImplementationOnce(() => { throw new Error('read error'); })
        .mockReturnValueOnce('# Good\nContent');
      mockNoteRepo.create.mockReturnValue({
        id: 'n1', title: 'Good', folderId: 'f1', filePath: 'n1.md',
        isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
      });
      mockTagRepo.getAll.mockReturnValue([]);

      const count = importExportService.importFolder('/some/folder', 'f1');

      // Only the second file should succeed
      expect(count).toBe(1);
    });

    it('should return 0 for empty folder', () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isDirectory: () => true });
      mockReaddirSync.mockReturnValue([]);

      const count = importExportService.importFolder('/empty/folder', 'f1');

      expect(count).toBe(0);
    });
  });

  describe('exportNote', () => {
    it('should export note with front matter by default', () => {
      const noteDetail = {
        id: 'n1', title: 'My Note', folderId: 'f1', filePath: 'n1.md',
        isPinned: false, wordCount: 10, tags: ['work'], createdAt: '2025-01-01', updatedAt: '2025-06-01',
        content: '# My Note\nHello world',
      };
      mockNoteRepo.getById.mockReturnValue(noteDetail);
      mockExistsSync.mockReturnValue(true); // dir exists

      const result = importExportService.exportNote('n1', '/output/note.md');

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/output/note.md',
        expect.stringContaining('---'),
        'utf-8',
      );
      const written = mockWriteFileSync.mock.calls[0][1] as string;
      expect(written).toContain('title: "My Note"');
      expect(written).toContain('# My Note');
      expect(result).toBe('/output/note.md');
    });

    it('should export note without front matter when disabled', () => {
      mockNoteRepo.getById.mockReturnValue({
        id: 'n1', title: 'My Note', folderId: 'f1', filePath: 'n1.md',
        isPinned: false, wordCount: 10, tags: [], createdAt: '', updatedAt: '',
        content: '# My Note\nHello',
      });
      mockExistsSync.mockReturnValue(true);

      importExportService.exportNote('n1', '/output/note.md', { includeFrontMatter: false });

      const written = mockWriteFileSync.mock.calls[0][1] as string;
      expect(written).toBe('# My Note\nHello');
      expect(written).not.toContain('---');
    });

    it('should throw when note does not exist', () => {
      mockNoteRepo.getById.mockReturnValue(null);

      expect(() => importExportService.exportNote('bad', '/out.md')).toThrow('笔记不存在');
    });

    it('should create output directory if it does not exist', () => {
      mockNoteRepo.getById.mockReturnValue({
        id: 'n1', title: 'N', folderId: 'f1', filePath: 'n1.md',
        isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
        content: 'content',
      });
      mockExistsSync.mockReturnValue(false);

      importExportService.exportNote('n1', '/new/dir/note.md');

      expect(mockMkdirSync).toHaveBeenCalledWith('/new/dir', { recursive: true });
    });
  });

  describe('exportFolder', () => {
    it('should export all notes in a folder', () => {
      const mockPrepare = vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([
          { id: 'n1', title: 'Note A', file_path: 'n1.md' },
          { id: 'n2', title: 'Note B', file_path: 'n2.md' },
        ]),
      });
      mockGetDb.mockReturnValue({ prepare: mockPrepare } as any);

      // For each exportNote call
      mockNoteRepo.getById
        .mockReturnValueOnce({
          id: 'n1', title: 'Note A', folderId: 'f1', filePath: 'n1.md',
          isPinned: false, wordCount: 5, tags: [], createdAt: '', updatedAt: '',
          content: 'Content A',
        })
        .mockReturnValueOnce({
          id: 'n2', title: 'Note B', folderId: 'f1', filePath: 'n2.md',
          isPinned: false, wordCount: 5, tags: [], createdAt: '', updatedAt: '',
          content: 'Content B',
        });
      mockExistsSync.mockReturnValue(true);

      const count = importExportService.exportFolder('f1', '/output/folder');

      expect(count).toBe(2);
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when folder has no notes', () => {
      const mockPrepare = vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([]),
      });
      mockGetDb.mockReturnValue({ prepare: mockPrepare } as any);

      const count = importExportService.exportFolder('empty', '/output');

      expect(count).toBe(0);
    });

    it('should create output directory if needed', () => {
      const mockPrepare = vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([
          { id: 'n1', title: 'Test', file_path: 'n1.md' },
        ]),
      });
      mockGetDb.mockReturnValue({ prepare: mockPrepare } as any);
      mockNoteRepo.getById.mockReturnValue({
        id: 'n1', title: 'Test', folderId: 'f1', filePath: 'n1.md',
        isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
        content: 'x',
      });
      mockExistsSync.mockReturnValue(false);

      importExportService.exportFolder('f1', '/new/output/dir');

      expect(mockMkdirSync).toHaveBeenCalledWith('/new/output/dir', { recursive: true });
    });

    it('should continue exporting when a single note fails', () => {
      const mockPrepare = vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([
          { id: 'n1', title: 'Bad Note', file_path: 'n1.md' },
          { id: 'n2', title: 'Good Note', file_path: 'n2.md' },
        ]),
      });
      mockGetDb.mockReturnValue({ prepare: mockPrepare } as any);
      mockNoteRepo.getById
        .mockReturnValueOnce(null) // n1 not found -> throws
        .mockReturnValueOnce({
          id: 'n2', title: 'Good Note', folderId: 'f1', filePath: 'n2.md',
          isPinned: false, wordCount: 0, tags: [], createdAt: '', updatedAt: '',
          content: 'ok',
        });
      mockExistsSync.mockReturnValue(true);

      const count = importExportService.exportFolder('f1', '/output');

      expect(count).toBe(1);
    });
  });
});
