import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/core/database/repositories/folder-repository', () => ({
  folderRepository: {
    create: vi.fn(),
    getTree: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    move: vi.fn(),
    reorder: vi.fn(),
    getPath: vi.fn(),
  },
}));

import { folderService } from '../../../src/core/services/folder-service';
import { folderRepository } from '../../../src/core/database/repositories/folder-repository';

const mockRepo = vi.mocked(folderRepository);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('folderService', () => {
  describe('create', () => {
    it('should create a folder and return it', () => {
      const params = { name: 'My Folder' };
      const expected = {
        id: 'folder-1',
        name: 'My Folder',
        parentId: null,
        sortOrder: 1,
        icon: 'folder',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };
      mockRepo.create.mockReturnValue(expected);

      const result = folderService.create(params);

      expect(mockRepo.create).toHaveBeenCalledWith(params);
      expect(result).toEqual(expected);
    });

    it('should create a subfolder with parentId', () => {
      const params = { name: 'Sub Folder', parentId: 'parent-1' };
      const expected = {
        id: 'folder-2',
        name: 'Sub Folder',
        parentId: 'parent-1',
        sortOrder: 1,
        icon: 'folder',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };
      mockRepo.create.mockReturnValue(expected);

      const result = folderService.create(params);

      expect(result.parentId).toBe('parent-1');
    });
  });

  describe('getTree', () => {
    it('should return the folder tree', () => {
      const tree = [
        {
          id: 'f1', name: 'Root', parentId: null, sortOrder: 1, icon: 'folder',
          children: [
            { id: 'f2', name: 'Child', parentId: 'f1', sortOrder: 1, icon: 'folder', children: [], noteCount: 3 },
          ],
          noteCount: 5,
        },
      ];
      mockRepo.getTree.mockReturnValue(tree);

      const result = folderService.getTree();

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].noteCount).toBe(5);
    });
  });

  describe('getById', () => {
    it('should return folder when found', () => {
      const folder = {
        id: 'f1', name: 'Test', parentId: null, sortOrder: 1,
        icon: 'folder', createdAt: '', updatedAt: '',
      };
      mockRepo.getById.mockReturnValue(folder);

      const result = folderService.getById('f1');

      expect(result).toEqual(folder);
    });

    it('should return null when not found', () => {
      mockRepo.getById.mockReturnValue(null);

      const result = folderService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update folder name', () => {
      const updated = {
        id: 'f1', name: 'Renamed', parentId: null, sortOrder: 1,
        icon: 'folder', createdAt: '', updatedAt: '2025-06-01T00:00:00Z',
      };
      mockRepo.update.mockReturnValue(updated);

      const result = folderService.update('f1', { name: 'Renamed' });

      expect(mockRepo.update).toHaveBeenCalledWith('f1', { name: 'Renamed' });
      expect(result!.name).toBe('Renamed');
    });

    it('should update folder icon', () => {
      const updated = {
        id: 'f1', name: 'Test', parentId: null, sortOrder: 1,
        icon: 'star', createdAt: '', updatedAt: '',
      };
      mockRepo.update.mockReturnValue(updated);

      const result = folderService.update('f1', { icon: 'star' });

      expect(result!.icon).toBe('star');
    });

    it('should return null for nonexistent folder', () => {
      mockRepo.update.mockReturnValue(null);

      const result = folderService.update('bad', { name: 'X' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete folder via repository', () => {
      folderService.delete('f1');

      expect(mockRepo.delete).toHaveBeenCalledWith('f1');
    });
  });

  describe('move', () => {
    it('should move folder to new parent', () => {
      folderService.move('f1', 'parent-2');

      expect(mockRepo.move).toHaveBeenCalledWith('f1', 'parent-2');
    });

    it('should move folder to root (null parent)', () => {
      folderService.move('f1', null);

      expect(mockRepo.move).toHaveBeenCalledWith('f1', null);
    });
  });

  describe('reorder', () => {
    it('should reorder folders', () => {
      folderService.reorder(['f2', 'f1', 'f3']);

      expect(mockRepo.reorder).toHaveBeenCalledWith(['f2', 'f1', 'f3']);
    });
  });

  describe('getPath', () => {
    it('should return breadcrumb path', () => {
      const path = [
        { id: 'root', name: 'Root', parentId: null, sortOrder: 1, icon: 'folder', createdAt: '', updatedAt: '' },
        { id: 'child', name: 'Child', parentId: 'root', sortOrder: 1, icon: 'folder', createdAt: '', updatedAt: '' },
      ];
      mockRepo.getPath.mockReturnValue(path);

      const result = folderService.getPath('child');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Root');
      expect(result[1].name).toBe('Child');
    });

    it('should return empty array for nonexistent folder', () => {
      mockRepo.getPath.mockReturnValue([]);

      const result = folderService.getPath('nonexistent');

      expect(result).toHaveLength(0);
    });
  });
});
