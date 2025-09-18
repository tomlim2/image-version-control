import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { StorageManager } from '../../packages/core/src/storage/StorageManager.js';
import { Project, Tree, ImageNode, WorkspaceContext } from '../../packages/core/src/types/index.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = jest.mocked(fs);

describe('StorageManager', () => {
  let storageManager: StorageManager;
  let testProjectPath: string;

  beforeEach(() => {
    testProjectPath = '/test/project';
    storageManager = new StorageManager(testProjectPath);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Project Structure Creation', () => {
    test('should create project directory structure', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await storageManager.createProjectStructure();

      expect(mockedFs.ensureDir).toHaveBeenCalledWith(path.join(testProjectPath, '.pixtree'));
      expect(mockedFs.ensureDir).toHaveBeenCalledWith(path.join(testProjectPath, '.pixtree', 'images'));
      expect(mockedFs.ensureDir).toHaveBeenCalledWith(path.join(testProjectPath, '.pixtree', 'nodes'));
      expect(mockedFs.ensureDir).toHaveBeenCalledWith(path.join(testProjectPath, '.pixtree', 'trees'));
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', '.gitignore'),
        'images/\n*.tmp\n*.cache\n'
      );
    });

    test('should initialize empty workspace context', async () => {
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
      mockedFs.writeJSON.mockResolvedValue(undefined);

      await storageManager.createProjectStructure();

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'context.json'),
        {
          recentProjects: [],
          recentTrees: []
        },
        { spaces: 2 }
      );
    });
  });

  describe('Configuration Management', () => {
    test('should save project config', async () => {
      const config = {
        name: 'Test Project',
        version: '2.0.0',
        projectId: 'test-proj-123'
      } as any;

      mockedFs.writeJSON.mockResolvedValue(undefined);

      await storageManager.saveConfig(config);

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'config.json'),
        config,
        { spaces: 2 }
      );
    });

    test('should load project config', async () => {
      const config = { name: 'Test Project', version: '2.0.0' };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON.mockResolvedValue(config);

      const result = await storageManager.loadConfig();

      expect(result).toEqual(config);
      expect(mockedFs.readJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'config.json')
      );
    });

    test('should throw error when config not found', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(storageManager.loadConfig()).rejects.toThrow(
        'Project not initialized. Run "pixtree init" first.'
      );
    });

    test('should update config', async () => {
      const existingConfig = { name: 'Old Name', version: '1.0.0' };
      const updates = { name: 'New Name' };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON.mockResolvedValue(existingConfig);
      mockedFs.writeJSON.mockResolvedValue(undefined);

      await storageManager.updateConfig(updates);

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'config.json'),
        { ...existingConfig, ...updates },
        { spaces: 2 }
      );
    });
  });

  describe('Project Management', () => {
    test('should save project metadata', async () => {
      const project: Project = {
        id: 'proj-123',
        name: 'Test Project',
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {
          totalTrees: 0,
          totalImages: 0,
          totalSize: 0,
          tags: [],
          favoriteCount: 0,
          avgRating: 0
        },
        settings: {
          defaultModel: 'nano-banana',
          autoTagging: false,
          autoAnalysis: false,
          defaultTreeOnImport: ''
        },
        stats: {
          totalGenerations: 0,
          totalImports: 0,
          lastActivity: new Date(),
          mostUsedModels: {},
          topTags: {}
        }
      };

      mockedFs.writeJSON.mockResolvedValue(undefined);

      await storageManager.saveProject(project);

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'project.json'),
        project,
        { spaces: 2 }
      );
    });

    test('should load project metadata', async () => {
      const project = { id: 'proj-123', name: 'Test Project' };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON.mockResolvedValue(project);

      const result = await storageManager.loadProject();

      expect(result).toEqual(project);
    });

    test('should update project with lastAccessed time', async () => {
      const existingProject = { id: 'proj-123', name: 'Test' };
      const updates = { name: 'Updated' };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON.mockResolvedValue(existingProject);
      mockedFs.writeJSON.mockResolvedValue(undefined);

      const result = await storageManager.updateProject(updates);

      expect(result.name).toBe('Updated');
      expect(result.lastAccessed).toBeInstanceOf(Date);
    });
  });

  describe('Tree Management', () => {
    test('should save tree metadata', async () => {
      const tree: Tree = {
        id: 'tree-123',
        projectId: 'proj-123',
        name: 'Test Tree',
        createdAt: new Date(),
        lastAccessed: new Date(),
        type: 'creative',
        metadata: {
          totalNodes: 0,
          depth: 0,
          totalSize: 0,
          branchCount: 0,
          leafCount: 0
        },
        tags: [],
        favorite: false,
        archived: false,
        stats: {
          totalGenerations: 0,
          totalImports: 0,
          lastActivity: new Date(),
          avgRating: 0,
          mostUsedPrompts: []
        }
      };

      mockedFs.writeJSON.mockResolvedValue(undefined);

      await storageManager.saveTree(tree);

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'trees', 'tree-123.json'),
        tree,
        { spaces: 2 }
      );
    });

    test('should load tree metadata', async () => {
      const tree = { id: 'tree-123', name: 'Test Tree' };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON.mockResolvedValue(tree);

      const result = await storageManager.loadTree('tree-123');

      expect(result).toEqual(tree);
    });

    test('should get all tree IDs', async () => {
      mockedFs.readdir.mockResolvedValue(['tree-1.json', 'tree-2.json', 'other.txt'] as any);

      const result = await storageManager.getAllTreeIds();

      expect(result).toEqual(['tree-1', 'tree-2']);
    });

    test('should load all trees', async () => {
      const tree1 = { id: 'tree-1', name: 'Tree 1' };
      const tree2 = { id: 'tree-2', name: 'Tree 2' };
      
      mockedFs.readdir.mockResolvedValue(['tree-1.json', 'tree-2.json'] as any);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON
        .mockResolvedValueOnce(tree1)
        .mockResolvedValueOnce(tree2);

      const result = await storageManager.loadAllTrees();

      expect(result).toEqual([tree1, tree2]);
    });

    test('should delete tree and optionally its nodes', async () => {
      const treeNodes = [
        { id: 'node-1', treeId: 'tree-123' },
        { id: 'node-2', treeId: 'other-tree' }
      ];

      mockedFs.remove.mockResolvedValue(undefined);
      
      // Mock loadAllNodes for deleteNodes = true case
      jest.spyOn(storageManager, 'loadAllNodes').mockResolvedValue(treeNodes as any);
      jest.spyOn(storageManager, 'deleteNode').mockResolvedValue(undefined);

      await storageManager.deleteTree('tree-123', true);

      expect(storageManager.deleteNode).toHaveBeenCalledWith('node-1');
      expect(storageManager.deleteNode).not.toHaveBeenCalledWith('node-2');
      expect(mockedFs.remove).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'trees', 'tree-123.json')
      );
    });

    test('should generate unique tree ID', () => {
      const id1 = storageManager.generateTreeId();
      const id2 = storageManager.generateTreeId();

      expect(id1).toMatch(/^tree-[a-z0-9]+-[a-f0-9]{8}$/);
      expect(id2).toMatch(/^tree-[a-z0-9]+-[a-f0-9]{8}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Node Management', () => {
    test('should save image and return hash', async () => {
      const imageData = Buffer.from('test image data');
      const nodeId = 'node-123';
      const expectedHash = 'abc123def456';
      
      jest.spyOn(storageManager, 'generateImageHash').mockReturnValue(expectedHash);
      mockedFs.pathExists.mockResolvedValue(false);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await storageManager.saveImage(imageData, nodeId);

      expect(result.imageHash).toBe(expectedHash);
      expect(result.imagePath).toBe('.pixtree/images/abc123def456.png');
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'images', 'abc123def456.png'),
        imageData
      );
    });

    test('should not save duplicate images', async () => {
      const imageData = Buffer.from('test image data');
      const nodeId = 'node-123';
      const expectedHash = 'abc123def456';
      
      jest.spyOn(storageManager, 'generateImageHash').mockReturnValue(expectedHash);
      mockedFs.pathExists.mockResolvedValue(true); // Image already exists
      mockedFs.writeFile.mockResolvedValue(undefined);

      const result = await storageManager.saveImage(imageData, nodeId);

      expect(result.imageHash).toBe(expectedHash);
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    test('should save node metadata', async () => {
      const node: ImageNode = {
        id: 'node-123',
        projectId: 'proj-123',
        treeId: 'tree-123',
        imagePath: 'test.png',
        imageHash: 'hash123',
        source: 'generated',
        userMetadata: {
          tags: [],
          favorite: false,
          collections: []
        },
        success: true,
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {
          fileSize: 1000,
          dimensions: { width: 100, height: 100 },
          format: 'png',
          hasAlpha: false
        },
        treePosition: {
          depth: 0,
          childIndex: 0,
          hasChildren: false,
          isLeaf: true
        }
      };

      mockedFs.writeJSON.mockResolvedValue(undefined);

      await storageManager.saveNode(node);

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'nodes', 'node-123.json'),
        node,
        { spaces: 2 }
      );
    });

    test('should load node metadata', async () => {
      const node = { id: 'node-123', name: 'Test Node' };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON.mockResolvedValue(node);

      const result = await storageManager.loadNode('node-123');

      expect(result).toEqual(node);
    });

    test('should generate unique node ID', () => {
      const id1 = storageManager.generateNodeId();
      const id2 = storageManager.generateNodeId();

      expect(id1).toMatch(/^node-[a-z0-9]+-[a-f0-9]{8}$/);
      expect(id2).toMatch(/^node-[a-z0-9]+-[a-f0-9]{8}$/);
      expect(id1).not.toBe(id2);
    });

    test('should generate image hash', () => {
      const imageData = Buffer.from('test image data');
      const hash = storageManager.generateImageHash(imageData);

      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe('Context Management', () => {
    test('should save workspace context', async () => {
      const context: WorkspaceContext = {
        recentProjects: [],
        recentTrees: []
      };

      mockedFs.writeJSON.mockResolvedValue(undefined);

      await storageManager.saveContext(context);

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'context.json'),
        context,
        { spaces: 2 }
      );
    });

    test('should load workspace context', async () => {
      const context = { currentProject: { id: 'proj-1' } };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON.mockResolvedValue(context);

      const result = await storageManager.loadContext();

      expect(result).toEqual(context);
    });

    test('should return default context when file not exists', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      const result = await storageManager.loadContext();

      expect(result).toEqual({
        recentProjects: [],
        recentTrees: []
      });
    });

    test('should set current project context', async () => {
      const project = { id: 'proj-1', name: 'Test' } as Project;
      const existingContext = { recentProjects: [], recentTrees: [] };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON.mockResolvedValue(existingContext);
      mockedFs.writeJSON.mockResolvedValue(undefined);

      await storageManager.setCurrentProject(project);

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'context.json'),
        {
          currentProject: project,
          recentProjects: [project],
          recentTrees: [],
          currentTree: undefined,
          currentNode: undefined
        },
        { spaces: 2 }
      );
    });

    test('should set current tree context', async () => {
      const tree = { id: 'tree-1', name: 'Test' } as Tree;
      const existingContext = { recentProjects: [], recentTrees: [] };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readJSON.mockResolvedValue(existingContext);
      mockedFs.writeJSON.mockResolvedValue(undefined);

      await storageManager.setCurrentTree(tree);

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'context.json'),
        {
          currentTree: tree,
          recentTrees: [tree],
          recentProjects: [],
          currentNode: undefined
        },
        { spaces: 2 }
      );
    });
  });

  describe('Search and Statistics', () => {
    const mockNodes: ImageNode[] = [
      {
        id: 'node-1',
        projectId: 'proj-1',
        treeId: 'tree-1',
        imagePath: 'image1.png',
        imageHash: 'hash1',
        source: 'generated',
        model: 'nano-banana',
        userMetadata: {
          tags: ['fantasy', 'character'],
          favorite: true,
          rating: 5,
          collections: []
        },
        success: true,
        createdAt: new Date('2024-01-01'),
        lastAccessed: new Date(),
        metadata: {
          fileSize: 1000,
          dimensions: { width: 512, height: 512 },
          format: 'png',
          hasAlpha: false
        },
        treePosition: {
          depth: 0,
          childIndex: 0,
          hasChildren: false,
          isLeaf: true
        }
      },
      {
        id: 'node-2',
        projectId: 'proj-1',
        treeId: 'tree-2',
        imagePath: 'image2.png',
        imageHash: 'hash2',
        source: 'imported',
        userMetadata: {
          tags: ['reference'],
          favorite: false,
          rating: 3,
          collections: []
        },
        success: true,
        createdAt: new Date('2024-01-02'),
        lastAccessed: new Date(),
        metadata: {
          fileSize: 2000,
          dimensions: { width: 1024, height: 1024 },
          format: 'jpg',
          hasAlpha: false
        },
        treePosition: {
          depth: 0,
          childIndex: 0,
          hasChildren: false,
          isLeaf: true
        }
      }
    ];

    test('should search nodes with enhanced options', async () => {
      jest.spyOn(storageManager, 'loadAllNodes').mockResolvedValue(mockNodes);

      const result = await storageManager.searchNodesEnhanced({
        treeId: 'tree-1',
        tags: ['fantasy'],
        rating: 4,
        favorite: true
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('node-1');
    });

    test('should get project statistics', async () => {
      const mockTrees = [
        { id: 'tree-1', name: 'Tree 1' },
        { id: 'tree-2', name: 'Tree 2' }
      ];

      jest.spyOn(storageManager, 'loadAllNodes').mockResolvedValue(mockNodes);
      jest.spyOn(storageManager, 'loadAllTrees').mockResolvedValue(mockTrees as any);
      jest.spyOn(storageManager as any, 'calculateTotalSize').mockResolvedValue(3000);

      const result = await storageManager.getProjectStats();

      expect(result.totalImages).toBe(2);
      expect(result.totalTrees).toBe(2);
      expect(result.totalSize).toBe(3000);
      expect(result.imagesByRating['5']).toBe(1);
      expect(result.imagesByRating['3']).toBe(1);
      expect(result.favoriteCount).toBe(1);
    });

    test('should get tree statistics', async () => {
      jest.spyOn(storageManager, 'loadTree').mockResolvedValue({ id: 'tree-1' } as any);
      jest.spyOn(storageManager, 'loadAllNodes').mockResolvedValue(mockNodes);

      const result = await storageManager.getTreeStats('tree-1');

      expect(result.totalNodes).toBe(1);
      expect(result.generationCount).toBe(1);
      expect(result.importCount).toBe(0);
      expect(result.averageRating).toBe(5);
    });
  });

  describe('Utility Methods', () => {
    test('should check if project is initialized', async () => {
      mockedFs.pathExists.mockResolvedValue(true);

      const result = await storageManager.isInitialized();

      expect(result).toBe(true);
      expect(mockedFs.pathExists).toHaveBeenCalledWith(
        path.join(testProjectPath, '.pixtree', 'config.json')
      );
    });

    test('should return project path', () => {
      const result = storageManager.getProjectPath();
      expect(result).toBe(testProjectPath);
    });

    test('should return pixtree internal path', () => {
      const result = storageManager.getPixtreePath();
      expect(result).toBe(path.join(testProjectPath, '.pixtree'));
    });
  });
});