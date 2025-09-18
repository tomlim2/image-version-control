import { StorageManager } from '../../packages/core/src/storage/StorageManager';

// Mock fs-extra
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  writeJSON: jest.fn().mockResolvedValue(undefined),
  readJSON: jest.fn().mockResolvedValue({}),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
  copy: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined)
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn((p) => p.split('/').pop()),
  extname: jest.fn((p) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/'))
}));

describe('StorageManager - Simple Tests', () => {
  let storage: StorageManager;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new StorageManager('/test/project');
  });

  describe('Basic Functionality', () => {
    it('should create StorageManager instance', () => {
      expect(storage).toBeInstanceOf(StorageManager);
    });

    it('should return project path', () => {
      const path = storage.getProjectPath();
      expect(path).toBe('/test/project');
    });

    it('should generate unique node IDs', () => {
      const id1 = storage.generateNodeId();
      const id2 = storage.generateNodeId();
      
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^node-/);
      expect(id2).toMatch(/^node-/);
    });
  });

  describe('Project Structure', () => {
    it('should create project structure', async () => {
      const fs = require('fs-extra');
      
      await storage.createProjectStructure();
      
      // Verify directories are created
      expect(fs.ensureDir).toHaveBeenCalledWith('/test/project/.pixtree');
      expect(fs.ensureDir).toHaveBeenCalledWith('/test/project/images');
      expect(fs.ensureDir).toHaveBeenCalledWith('/test/project/.pixtree/trees');
    });

    it('should check if project is initialized', async () => {
      const fs = require('fs-extra');
      
      // Mock project not initialized
      fs.pathExists.mockResolvedValue(false);
      let result = await storage.isInitialized();
      expect(result).toBe(false);
      
      // Mock project initialized
      fs.pathExists.mockResolvedValue(true);
      result = await storage.isInitialized();
      expect(result).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should save and load configuration', async () => {
      const fs = require('fs-extra');
      
      const mockConfig = {
        name: 'Test Project',
        version: '1.0.0',
        projectId: 'test-123',
        aiProviders: {},
        storage: {
          autoCleanup: false,
          compressionThreshold: 2,
          deleteThreshold: 1,
          maxStorageSize: '10GB',
          backupFrequency: 'never' as const
        },
        preferences: {
          defaultModel: 'nano-banana',
          autoExportFavorites: false,
          showThumbnails: true,
          defaultTreeType: 'creative' as const,
          autoCreateTreeOnImport: true,
          promptSuggestions: true
        },
        projectMetadata: {
          createdAt: new Date(),
          totalProjects: 1
        }
      };

      // Test save config
      await storage.saveConfig(mockConfig);
      expect(fs.writeJSON).toHaveBeenCalledWith(
        '/test/project/.pixtree/config.json',
        mockConfig,
        { spaces: 2 }
      );

      // Test load config
      fs.readJSON.mockResolvedValue(mockConfig);
      const result = await storage.loadConfig();
      expect(result).toEqual(mockConfig);
      expect(fs.readJSON).toHaveBeenCalledWith('/test/project/.pixtree/config.json');
    });
  });

  describe('Image Storage', () => {
    it('should save image data', async () => {
      const fs = require('fs-extra');
      const imageData = Buffer.from('fake-image-data');
      const nodeId = 'node-test-123';
      
      const result = await storage.saveImage(imageData, nodeId);
      
      expect(result).toEqual({
        imagePath: 'images/node-test-123.png',
        imageHash: expect.any(String)
      });
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/project/images/node-test-123.png',
        imageData
      );
    });

    it('should generate hash for image data', () => {
      const imageData1 = Buffer.from('test-data-1');
      const imageData2 = Buffer.from('test-data-2');
      const imageData3 = Buffer.from('test-data-1'); // Same as first
      
      const hash1 = (storage as any).generateImageHash(imageData1);
      const hash2 = (storage as any).generateImageHash(imageData2);
      const hash3 = (storage as any).generateImageHash(imageData3);
      
      expect(typeof hash1).toBe('string');
      expect(typeof hash2).toBe('string');
      expect(hash1).not.toBe(hash2); // Different data = different hash
      expect(hash1).toBe(hash3);     // Same data = same hash
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const fs = require('fs-extra');
      fs.readJSON.mockRejectedValue(new Error('File not found'));
      
      await expect(storage.loadConfig()).rejects.toThrow('File not found');
    });

    it('should handle invalid project paths', () => {
      expect(() => new StorageManager('')).toThrow();
    });
  });
});