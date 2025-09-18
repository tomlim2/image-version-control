import { jest } from '@jest/globals';
import { ImageVersionControl } from '../../packages/core/src/ImageVersionControl.js';
import { StorageManager } from '../../packages/core/src/storage/StorageManager.js';
import { ProjectManager } from '../../packages/core/src/managers/ProjectManager.js';
import { TreeManager } from '../../packages/core/src/managers/TreeManager.js';
import { AIProviderRegistry } from '../../packages/core/src/ai/index.js';
import { NanoBananaProvider } from '../../packages/core/src/ai/NanoBananaProvider.js';
import fs from 'fs-extra';
import path from 'path';
import {
  ImageNode,
  Project,
  Tree,
  ProjectConfig,
  ProjectCreationOptions,
  GenerateOptions,
  ImportOptions,
  WorkspaceContext,
  StatusInfo,
  ProjectStats,
  TreeStats,
  DiffResult,
  BlendPreview,
  MergeStrategy
} from '../../packages/core/src/types/index.js';

jest.mock('../../packages/core/src/storage/StorageManager.js');
jest.mock('../../packages/core/src/managers/ProjectManager.js');
jest.mock('../../packages/core/src/managers/TreeManager.js');
jest.mock('../../packages/core/src/ai/index.js');
jest.mock('../../packages/core/src/ai/NanoBananaProvider.js');
jest.mock('fs-extra');
jest.mock('path');

describe('ImageVersionControl', () => {
  let ivc: ImageVersionControl;
  let mockStorage: jest.Mocked<StorageManager>;
  let mockProjectManager: jest.Mocked<ProjectManager>;
  let mockTreeManager: jest.Mocked<TreeManager>;
  let mockAiRegistry: jest.Mocked<AIProviderRegistry>;
  let mockProvider: any;

  const mockProject: Project = {
    id: 'proj-test-123',
    name: 'Test Project',
    description: 'A test project',
    createdAt: new Date('2024-01-01'),
    lastAccessed: new Date('2024-01-02'),
    metadata: {
      totalTrees: 2,
      totalImages: 10,
      totalSize: 1024000,
      tags: ['nature', 'abstract'],
      favoriteCount: 3,
      avgRating: 4.2
    },
    settings: {
      defaultModel: 'nano-banana',
      autoTagging: true,
      autoAnalysis: false,
      defaultTreeOnImport: 'tree-123'
    },
    stats: {
      totalGenerations: 8,
      totalImports: 2,
      lastActivity: new Date('2024-01-02'),
      mostUsedModels: { 'nano-banana': 8 },
      topTags: { 'nature': 5, 'abstract': 3 }
    }
  };

  const mockTree: Tree = {
    id: 'tree-123',
    projectId: 'proj-test-123',
    name: 'Test Tree',
    description: 'A test tree',
    type: 'creative',
    createdAt: new Date('2024-01-01'),
    lastAccessed: new Date('2024-01-02'),
    tags: ['nature'],
    metadata: {
      totalNodes: 5,
      maxDepth: 3,
      totalSize: 512000,
      favoriteCount: 2,
      avgRating: 4.0
    },
    settings: {
      defaultModel: 'nano-banana',
      autoTagging: true,
      maxBranching: 3
    },
    stats: {
      totalGenerations: 4,
      totalImports: 1,
      lastActivity: new Date('2024-01-02'),
      modelUsage: { 'nano-banana': 4 },
      popularTags: { 'nature': 3 }
    },
    rootNodeId: 'node-root-123'
  };

  const mockConfig: ProjectConfig = {
    name: 'Test Project',
    version: '2.0.0',
    projectId: 'proj-test-123',
    currentTreeId: 'tree-123',
    aiProviders: {
      'nano-banana': {
        enabled: true,
        apiKey: 'test-api-key',
        defaultConfig: {
          temperature: 1.0,
          model: 'gemini-2.5-flash-image-preview'
        }
      }
    },
    storage: {
      autoCleanup: false,
      compressionThreshold: 2,
      deleteThreshold: 1,
      maxStorageSize: '10GB',
      backupFrequency: 'never'
    },
    preferences: {
      defaultModel: 'nano-banana',
      autoExportFavorites: false,
      showThumbnails: true,
      defaultTreeType: 'creative',
      autoCreateTreeOnImport: true,
      promptSuggestions: true
    },
    projectMetadata: {
      createdAt: new Date('2024-01-01'),
      totalProjects: 1
    }
  };

  const mockWorkspaceContext: WorkspaceContext = {
    currentProject: mockProject,
    currentTree: mockTree,
    currentNode: null,
    recentProjects: [mockProject],
    settings: {
      defaultModel: 'nano-banana',
      defaultTreeType: 'creative',
      autoSave: true
    }
  };

  const mockImageNode: ImageNode = {
    id: 'node-123',
    projectId: 'proj-test-123',
    treeId: 'tree-123',
    parentId: null,
    imagePath: '/path/to/image.png',
    imageHash: 'abc123hash',
    source: 'generated',
    model: 'nano-banana',
    generationParams: {
      prompt: 'A beautiful landscape',
      modelConfig: { temperature: 1.0 }
    },
    userMetadata: {
      tags: ['nature', 'landscape'],
      favorite: false,
      rating: 4,
      notes: '',
      collections: []
    },
    success: true,
    createdAt: new Date('2024-01-01'),
    lastAccessed: new Date('2024-01-02'),
    metadata: {
      fileSize: 1024000,
      dimensions: { width: 1024, height: 1024 },
      format: 'png',
      generationTime: 3.5,
      hasAlpha: false
    },
    treePosition: { depth: 0, childIndex: 0, hasChildren: false, isLeaf: true }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock StorageManager
    mockStorage = {
      isInitialized: jest.fn(),
      createProjectStructure: jest.fn(),
      saveConfig: jest.fn(),
      loadConfig: jest.fn(),
      loadContext: jest.fn(),
      getCurrentNode: jest.fn(),
      generateNodeId: jest.fn(),
      saveImage: jest.fn(),
      saveNode: jest.fn(),
      setCurrentNode: jest.fn(),
      loadNode: jest.fn(),
      searchNodes: jest.fn(),
      getStorageStats: jest.fn(),
      getProjectPath: jest.fn(),
      deleteNode: jest.fn(),
      loadAllNodes: jest.fn(),
      setCurrentTree: jest.fn()
    } as any;

    // Mock ProjectManager
    mockProjectManager = {
      createProject: jest.fn(),
      getProject: jest.fn(),
      updateProject: jest.fn(),
      getProjectStatistics: jest.fn(),
      getSuggestedActions: jest.fn(),
      validateProject: jest.fn()
    } as any;

    // Mock TreeManager
    mockTreeManager = {
      createTree: jest.fn(),
      getTree: jest.fn(),
      refreshTreeMetadata: jest.fn(),
      getAllTrees: jest.fn(),
      getTreeStatistics: jest.fn(),
      validateTree: jest.fn()
    } as any;

    // Mock AI Provider
    mockProvider = {
      generateImage: jest.fn(),
      analyzeImage: jest.fn(),
      blendPrompts: jest.fn()
    };

    // Mock AIProviderRegistry
    mockAiRegistry = {
      register: jest.fn(),
      getProvider: jest.fn(),
      createProvider: jest.fn()
    } as any;

    // Set up mocked constructors
    (StorageManager as jest.MockedClass<typeof StorageManager>).mockImplementation(() => mockStorage);
    (ProjectManager as jest.MockedClass<typeof ProjectManager>).mockImplementation(() => mockProjectManager);
    (TreeManager as jest.MockedClass<typeof TreeManager>).mockImplementation(() => mockTreeManager);
    (AIProviderRegistry as jest.MockedClass<typeof AIProviderRegistry>).mockImplementation(() => mockAiRegistry);

    ivc = new ImageVersionControl('/test/project/path');
  });

  describe('constructor', () => {
    it('should initialize all managers and registry', () => {
      expect(StorageManager).toHaveBeenCalledWith('/test/project/path');
      expect(ProjectManager).toHaveBeenCalledWith(mockStorage);
      expect(TreeManager).toHaveBeenCalledWith(mockStorage);
      expect(AIProviderRegistry).toHaveBeenCalled();
      expect(mockAiRegistry.register).toHaveBeenCalledWith('nano-banana', NanoBananaProvider);
    });
  });

  describe('init', () => {
    it('should initialize a new project', async () => {
      const options: ProjectCreationOptions & { apiKey?: string } = {
        name: 'New Project',
        description: 'A new test project',
        apiKey: 'test-api-key'
      };

      mockStorage.isInitialized.mockResolvedValue(false);
      mockStorage.createProjectStructure.mockResolvedValue();
      mockProjectManager.createProject.mockResolvedValue(mockProject);
      mockStorage.saveConfig.mockResolvedValue();

      const result = await ivc.init(options);

      expect(mockStorage.isInitialized).toHaveBeenCalled();
      expect(mockStorage.createProjectStructure).toHaveBeenCalled();
      expect(mockProjectManager.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'A new test project',
        defaultModel: 'nano-banana',
        initialTree: {
          name: 'Main',
          type: 'creative',
          description: 'Default tree for new images'
        }
      });
      expect(mockStorage.saveConfig).toHaveBeenCalled();
      expect(result).toBe(mockProject);
    });

    it('should throw error if project already initialized', async () => {
      mockStorage.isInitialized.mockResolvedValue(true);

      await expect(ivc.init({ name: 'Test' })).rejects.toThrow('Project already initialized');
    });

    it('should use custom initial tree options', async () => {
      const options = {
        name: 'Custom Project',
        initialTree: {
          name: 'Custom Tree',
          type: 'reference' as const,
          description: 'Custom initial tree'
        }
      };

      mockStorage.isInitialized.mockResolvedValue(false);
      mockStorage.createProjectStructure.mockResolvedValue();
      mockProjectManager.createProject.mockResolvedValue(mockProject);
      mockStorage.saveConfig.mockResolvedValue();

      await ivc.init(options);

      expect(mockProjectManager.createProject).toHaveBeenCalledWith({
        ...options,
        defaultModel: 'nano-banana'
      });
    });
  });

  describe('initLegacy', () => {
    it('should initialize project using legacy config format', async () => {
      const legacyConfig = {
        name: 'Legacy Project',
        preferences: { defaultModel: 'custom-model' },
        aiProviders: { 'nano-banana': { apiKey: 'legacy-key' } }
      };

      mockStorage.isInitialized.mockResolvedValue(false);
      mockStorage.createProjectStructure.mockResolvedValue();
      mockProjectManager.createProject.mockResolvedValue(mockProject);
      mockStorage.saveConfig.mockResolvedValue();

      await ivc.initLegacy(legacyConfig);

      expect(mockProjectManager.createProject).toHaveBeenCalledWith({
        name: 'Legacy Project',
        description: 'Legacy project initialization',
        defaultModel: 'custom-model'
      });
    });
  });

  describe('generate', () => {
    beforeEach(() => {
      mockStorage.loadConfig.mockResolvedValue(mockConfig);
      mockStorage.loadContext.mockResolvedValue(mockWorkspaceContext);
      mockProjectManager.getProject.mockResolvedValue(mockProject);
      mockStorage.getCurrentNode.mockResolvedValue(null);
      mockStorage.generateNodeId.mockReturnValue('new-node-123');
      mockAiRegistry.getProvider.mockReturnValue(mockProvider);
      mockStorage.saveImage.mockResolvedValue({ 
        imagePath: '/saved/image.png', 
        imageHash: 'new-hash-123' 
      });
      mockStorage.saveNode.mockResolvedValue();
      mockStorage.setCurrentNode.mockResolvedValue();
      mockTreeManager.refreshTreeMetadata.mockResolvedValue();
    });

    it('should generate image with default options', async () => {
      const imageData = Buffer.from('fake-image-data');
      mockProvider.generateImage.mockResolvedValue({
        imageData,
        metadata: {
          parameters: { temperature: 1.0 },
          generationTime: 3.5
        }
      });

      const result = await ivc.generate('A beautiful landscape');

      expect(mockProvider.generateImage).toHaveBeenCalledWith({
        prompt: 'A beautiful landscape',
        config: undefined
      });
      expect(mockStorage.saveImage).toHaveBeenCalledWith(imageData, 'new-node-123');
      expect(mockStorage.saveNode).toHaveBeenCalled();
      expect(mockTreeManager.refreshTreeMetadata).toHaveBeenCalledWith('tree-123');
      expect(result.id).toBe('new-node-123');
      expect(result.success).toBe(true);
    });

    it('should use specified tree ID', async () => {
      const imageData = Buffer.from('fake-image-data');
      mockProvider.generateImage.mockResolvedValue({
        imageData,
        metadata: { parameters: {}, generationTime: 2.0 }
      });

      const options: GenerateOptions = {
        model: 'nano-banana',
        treeId: 'custom-tree-456'
      };

      await ivc.generate('Test prompt', options);

      const savedNode = mockStorage.saveNode.mock.calls[0][0];
      expect(savedNode.treeId).toBe('custom-tree-456');
      expect(mockTreeManager.refreshTreeMetadata).toHaveBeenCalledWith('custom-tree-456');
    });

    it('should auto-create tree when specified', async () => {
      const imageData = Buffer.from('fake-image-data');
      const newTree = { ...mockTree, id: 'auto-created-tree' };
      
      mockProvider.generateImage.mockResolvedValue({
        imageData,
        metadata: { parameters: {}, generationTime: 2.0 }
      });
      mockTreeManager.createTree.mockResolvedValue(newTree);

      const options: GenerateOptions = {
        model: 'nano-banana',
        autoCreateTree: true
      };

      // Mock no current tree and no default
      mockStorage.loadContext.mockResolvedValue({
        ...mockWorkspaceContext,
        currentTree: null
      });
      mockProjectManager.getProject.mockResolvedValue({
        ...mockProject,
        settings: { ...mockProject.settings, defaultTreeOnImport: '' }
      });

      await ivc.generate('Test prompt', options);

      expect(mockTreeManager.createTree).toHaveBeenCalledWith({
        name: 'Generated Images',
        type: 'creative',
        description: 'Auto-created tree for image generation',
        projectId: 'proj-test-123'
      });
    });

    it('should throw error when no target tree is available', async () => {
      mockStorage.loadContext.mockResolvedValue({
        ...mockWorkspaceContext,
        currentTree: null
      });
      mockProjectManager.getProject.mockResolvedValue({
        ...mockProject,
        settings: { ...mockProject.settings, defaultTreeOnImport: '' }
      });

      await expect(ivc.generate('Test prompt')).rejects.toThrow(
        'No target tree specified. Use --tree option or create a tree first.'
      );
    });

    it('should create failed node on generation error', async () => {
      mockProvider.generateImage.mockRejectedValue(new Error('Generation failed'));

      await expect(ivc.generate('Test prompt')).rejects.toThrow('Generation failed');
      
      const savedNode = mockStorage.saveNode.mock.calls[0][0];
      expect(savedNode.success).toBe(false);
      expect(savedNode.error).toBe('Generation failed');
    });
  });

  describe('import', () => {
    beforeEach(() => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('fake-image-data'));
      (path.basename as jest.Mock).mockReturnValue('test-image.png');
      (path.extname as jest.Mock).mockReturnValue('.png');
      mockProjectManager.getProject.mockResolvedValue(mockProject);
      mockStorage.loadContext.mockResolvedValue(mockWorkspaceContext);
      mockStorage.generateNodeId.mockReturnValue('imported-node-123');
      mockStorage.saveImage.mockResolvedValue({ 
        imagePath: '/saved/imported.png', 
        imageHash: 'imported-hash-123' 
      });
      mockStorage.getCurrentNode.mockResolvedValue(null);
      mockStorage.saveNode.mockResolvedValue();
      mockStorage.setCurrentNode.mockResolvedValue();
      mockTreeManager.refreshTreeMetadata.mockResolvedValue();
    });

    it('should import image with basic options', async () => {
      const options: ImportOptions = {
        description: 'Test import',
        tags: ['imported', 'test']
      };

      const result = await ivc.import('/path/to/test-image.png', options);

      expect(fs.pathExists).toHaveBeenCalledWith('/path/to/test-image.png');
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/test-image.png');
      expect(mockStorage.saveImage).toHaveBeenCalled();
      expect(mockStorage.saveNode).toHaveBeenCalled();
      expect(result.source).toBe('imported');
      expect(result.userMetadata.tags).toContain('imported');
      expect(result.userMetadata.tags).toContain('test');
    });

    it('should analyze with AI when enabled', async () => {
      mockProvider.analyzeImage.mockResolvedValue({
        description: 'A landscape scene',
        detectedObjects: ['tree', 'mountain', 'sky'],
        style: 'photorealistic',
        mood: 'peaceful'
      });
      mockStorage.loadConfig.mockResolvedValue(mockConfig);
      mockAiRegistry.getProvider.mockReturnValue(mockProvider);

      const projectWithAnalysis = {
        ...mockProject,
        settings: { ...mockProject.settings, autoAnalysis: true, autoTagging: true }
      };
      mockProjectManager.getProject.mockResolvedValue(projectWithAnalysis);

      const options: ImportOptions = {
        analyzeWithAI: true,
        tags: ['manual-tag']
      };

      const result = await ivc.import('/path/to/test-image.png', options);

      expect(mockProvider.analyzeImage).toHaveBeenCalled();
      expect(result.aiAnalysis).toBeDefined();
      expect(result.userMetadata.tags).toContain('manual-tag');
      expect(result.userMetadata.tags).toContain('tree');
      expect(result.userMetadata.tags).toContain('photorealistic');
    });

    it('should handle AI analysis failure gracefully', async () => {
      mockProvider.analyzeImage.mockRejectedValue(new Error('AI analysis failed'));
      mockStorage.loadConfig.mockResolvedValue(mockConfig);
      mockAiRegistry.getProvider.mockReturnValue(mockProvider);

      const options: ImportOptions = {
        analyzeWithAI: true,
        tags: ['test']
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await ivc.import('/path/to/test-image.png', options);

      expect(consoleSpy).toHaveBeenCalledWith('AI analysis failed:', expect.any(Error));
      expect(result.aiAnalysis).toBeUndefined();
      expect(result.userMetadata.tags).toContain('test');
      
      consoleSpy.mockRestore();
    });

    it('should throw error for non-existent file', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      await expect(ivc.import('/nonexistent/file.png', {}))
        .rejects.toThrow('Image file not found: /nonexistent/file.png');
    });
  });

  describe('getTree', () => {
    it('should build tree structure from nodes', async () => {
      const nodes = [
        mockImageNode,
        { ...mockImageNode, id: 'child-1', parentId: 'node-123' },
        { ...mockImageNode, id: 'child-2', parentId: 'node-123' }
      ];
      mockStorage.loadAllNodes.mockResolvedValue(nodes);

      const result = await ivc.getTree();

      expect(result).toHaveLength(1); // One root
      expect(result[0].node.id).toBe('node-123');
      expect(result[0].children).toHaveLength(2);
    });
  });

  describe('checkout', () => {
    it('should switch to specified node', async () => {
      mockStorage.loadNode.mockResolvedValue(mockImageNode);
      mockStorage.setCurrentNode.mockResolvedValue();

      const result = await ivc.checkout('node-123');

      expect(mockStorage.loadNode).toHaveBeenCalledWith('node-123');
      expect(mockStorage.setCurrentNode).toHaveBeenCalledWith('node-123');
      expect(result).toBe(mockImageNode);
    });
  });

  describe('getCurrentNode', () => {
    it('should return current node', async () => {
      mockStorage.getCurrentNode.mockResolvedValue(mockImageNode);

      const result = await ivc.getCurrentNode();

      expect(result).toBe(mockImageNode);
    });
  });

  describe('diff', () => {
    it('should compare two nodes', async () => {
      const node1 = mockImageNode;
      const node2 = { ...mockImageNode, id: 'node-456', generationParams: { prompt: 'Different prompt' } };

      mockStorage.loadNode.mockResolvedValueOnce(node1).mockResolvedValueOnce(node2);

      const result = await ivc.diff('node-123', 'node-456');

      expect(result.node1).toBe(node1);
      expect(result.node2).toBe(node2);
      expect(result.similarity).toBeDefined();
      expect(result.differences).toBeDefined();
    });
  });

  describe('previewBlend', () => {
    it('should preview prompt blending', async () => {
      const node1 = { ...mockImageNode, generationParams: { prompt: 'A forest' } };
      const node2 = { ...mockImageNode, id: 'node-456', generationParams: { prompt: 'A mountain' } };
      const strategy: MergeStrategy = { type: 'weighted', weights: [0.5, 0.5] };

      mockStorage.loadNode.mockResolvedValueOnce(node1).mockResolvedValueOnce(node2);
      mockStorage.loadConfig.mockResolvedValue(mockConfig);
      mockAiRegistry.getProvider.mockReturnValue(mockProvider);
      
      mockProvider.blendPrompts.mockResolvedValue({
        blendedPrompt: 'A forest mountain landscape',
        explanation: 'Combined forest and mountain elements',
        expectedChanges: ['Mixed terrain features'],
        confidence: 0.8
      });

      const result = await ivc.previewBlend('node-123', 'node-456', strategy);

      expect(result.resultPrompt).toBe('A forest mountain landscape');
      expect(result.confidence).toBe(0.8);
    });

    it('should fallback to simple blending when provider doesnt support it', async () => {
      const node1 = { ...mockImageNode, generationParams: { prompt: 'A forest' } };
      const node2 = { ...mockImageNode, id: 'node-456', generationParams: { prompt: 'A mountain' } };
      const strategy: MergeStrategy = { type: 'weighted', weights: [0.5, 0.5] };

      mockStorage.loadNode.mockResolvedValueOnce(node1).mockResolvedValueOnce(node2);
      mockStorage.loadConfig.mockResolvedValue(mockConfig);
      const providerWithoutBlend = { generateImage: jest.fn() };
      mockAiRegistry.getProvider.mockReturnValue(providerWithoutBlend);

      const result = await ivc.previewBlend('node-123', 'node-456', strategy);

      expect(result.resultPrompt).toBe('A forest combined with A mountain');
      expect(result.explanation).toBe('Simple concatenation of prompts');
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('updateNode', () => {
    it('should update node metadata', async () => {
      const updates = {
        tags: ['updated', 'tags'],
        rating: 5,
        favorite: true,
        notes: 'Updated notes'
      };

      mockStorage.loadNode.mockResolvedValue(mockImageNode);
      mockStorage.saveNode.mockResolvedValue();

      const result = await ivc.updateNode('node-123', updates);

      expect(mockStorage.loadNode).toHaveBeenCalledWith('node-123');
      expect(mockStorage.saveNode).toHaveBeenCalled();
      
      const savedNode = mockStorage.saveNode.mock.calls[0][0];
      expect(savedNode.userMetadata.tags).toEqual(['updated', 'tags']);
      expect(savedNode.userMetadata.rating).toBe(5);
      expect(savedNode.userMetadata.favorite).toBe(true);
      expect(savedNode.userMetadata.notes).toBe('Updated notes');
    });
  });

  describe('search', () => {
    it('should search nodes by criteria', async () => {
      const query = {
        tags: ['nature'],
        rating: 4,
        model: 'nano-banana'
      };
      const searchResults = [mockImageNode];
      mockStorage.searchNodes.mockResolvedValue(searchResults);

      const result = await ivc.search(query);

      expect(mockStorage.searchNodes).toHaveBeenCalledWith(query);
      expect(result).toBe(searchResults);
    });
  });

  describe('export', () => {
    it('should export node image to specified path', async () => {
      (path.join as jest.Mock).mockReturnValue('/full/path/to/image.png');
      (path.dirname as jest.Mock).mockReturnValue('/export/dir');
      (fs.ensureDir as jest.Mock).mockResolvedValue();
      (fs.copy as jest.Mock).mockResolvedValue();
      
      mockStorage.loadNode.mockResolvedValue(mockImageNode);
      mockStorage.getProjectPath.mockReturnValue('/project/path');
      mockStorage.saveNode.mockResolvedValue();

      await ivc.export('node-123', '/export/path.png', 'custom-name');

      expect(fs.ensureDir).toHaveBeenCalledWith('/export/dir');
      expect(fs.copy).toHaveBeenCalledWith('/full/path/to/image.png', '/export/path.png');
      expect(mockStorage.saveNode).toHaveBeenCalled();
      
      const savedNode = mockStorage.saveNode.mock.calls[0][0];
      expect(savedNode.exports).toHaveLength(1);
      expect(savedNode.exports[0].customName).toBe('custom-name');
    });
  });

  describe('deleteNode', () => {
    it('should delete node', async () => {
      mockStorage.deleteNode.mockResolvedValue();

      await ivc.deleteNode('node-123');

      expect(mockStorage.deleteNode).toHaveBeenCalledWith('node-123');
    });
  });

  describe('getCurrentProject', () => {
    it('should get current project', async () => {
      mockProjectManager.getProject.mockResolvedValue(mockProject);

      const result = await ivc.getCurrentProject();

      expect(result).toBe(mockProject);
    });
  });

  describe('createTree', () => {
    it('should create tree in current project', async () => {
      const options = {
        name: 'New Tree',
        type: 'creative' as const,
        description: 'A new tree'
      };

      mockProjectManager.getProject.mockResolvedValue(mockProject);
      mockTreeManager.createTree.mockResolvedValue(mockTree);

      const result = await ivc.createTree(options);

      expect(mockTreeManager.createTree).toHaveBeenCalledWith({
        ...options,
        projectId: 'proj-test-123'
      });
      expect(result).toBe(mockTree);
    });
  });

  describe('switchToTree', () => {
    it('should switch to specified tree', async () => {
      mockTreeManager.getTree.mockResolvedValue(mockTree);
      mockStorage.setCurrentTree.mockResolvedValue();

      const result = await ivc.switchToTree('tree-123');

      expect(mockTreeManager.getTree).toHaveBeenCalledWith('tree-123');
      expect(mockStorage.setCurrentTree).toHaveBeenCalledWith(mockTree);
      expect(result).toBe(mockTree);
    });
  });

  describe('getWorkspaceContext', () => {
    it('should get workspace context', async () => {
      mockStorage.loadContext.mockResolvedValue(mockWorkspaceContext);

      const result = await ivc.getWorkspaceContext();

      expect(result).toBe(mockWorkspaceContext);
    });
  });

  describe('getStatus', () => {
    it('should get status information', async () => {
      mockStorage.loadContext.mockResolvedValue(mockWorkspaceContext);
      mockProjectManager.getProject.mockResolvedValue(mockProject);
      mockProjectManager.getSuggestedActions.mockResolvedValue(['Create a tree', 'Generate an image']);

      const result = await ivc.getStatus();

      expect(result.context).toBe(mockWorkspaceContext);
      expect(result.projectStats.totalImages).toBe(10);
      expect(result.suggestedActions).toEqual(['Create a tree', 'Generate an image']);
    });
  });

  describe('validateProject', () => {
    it('should validate project and all trees', async () => {
      const trees = [mockTree];
      const projectValidation = { valid: true, issues: [] };
      const treeValidation = { valid: true, issues: [] };

      mockProjectManager.validateProject.mockResolvedValue(projectValidation);
      mockTreeManager.getAllTrees.mockResolvedValue(trees);
      mockTreeManager.validateTree.mockResolvedValue(treeValidation);

      const result = await ivc.validateProject();

      expect(result.project).toBe(projectValidation);
      expect(result.trees['tree-123']).toBe(treeValidation);
    });
  });

  describe('private helper methods', () => {
    describe('analyzeImportPath', () => {
      it('should detect reference images from path', () => {
        const ivcInstance = ivc as any;
        
        const result = ivcInstance.analyzeImportPath('/user/references/inspiration-image.png');
        
        expect(result.isReference).toBe(true);
        expect(result.suggestedTags).toContain('references');
        expect(result.suggestedTags).toContain('inspiration');
        expect(result.confidence).toBeGreaterThan(0.5);
      });
      
      it('should detect creative output from path', () => {
        const ivcInstance = ivc as any;
        
        const result = ivcInstance.analyzeImportPath('/user/artwork/final-composition.png');
        
        expect(result.suggestedTags).toContain('artwork');
        expect(result.suggestedTags).toContain('final');
      });
      
      it('should detect screenshots', () => {
        const ivcInstance = ivc as any;
        
        const result = ivcInstance.analyzeImportPath('/desktop/screenshot-2024-01-01.png');
        
        expect(result.isReference).toBe(true);
        expect(result.suggestedTags).toContain('screenshot');
      });
    });
    
    describe('generateSmartTags', () => {
      it('should generate tags from AI analysis', () => {
        const ivcInstance = ivc as any;
        const aiAnalysis = {
          detectedObjects: ['tree', 'mountain', 'sky', 'water', 'rock', 'bird'], // More than 5
          style: 'Digital Art',
          mood: 'Peaceful Scene'
        };
        
        const result = ivcInstance.generateSmartTags(aiAnalysis, '/path/test-image.jpg');
        
        expect(result).toContain('tree');
        expect(result).toContain('mountain');
        expect(result).toContain('sky');
        expect(result).toContain('water');
        expect(result).toContain('rock');
        expect(result).not.toContain('bird'); // Should be limited to 5 objects
        expect(result).toContain('digital-art');
        expect(result).toContain('peaceful-scene');
        expect(result).toContain('jpg-file');
        expect(result.some(tag => tag.startsWith('imported-'))).toBe(true);
      });
    });
    
    describe('inferPurposeFromPath', () => {
      it('should infer purpose from various path patterns', () => {
        const ivcInstance = ivc as any;
        
        expect(ivcInstance.inferPurposeFromPath('/refs/inspiration.jpg'))
          .toBe('Reference material for creative work');
        
        expect(ivcInstance.inferPurposeFromPath('/mockups/wireframe.png'))
          .toBe('Design mockup or wireframe');
        
        expect(ivcInstance.inferPurposeFromPath('/final/output.png'))
          .toBe('Final output or completed work');
        
        expect(ivcInstance.inferPurposeFromPath('/screenshots/screenshot.png'))
          .toBe('Screenshot for reference');
        
        expect(ivcInstance.inferPurposeFromPath('/concepts/sketch.jpg'))
          .toBe('Concept or sketch work');
        
        expect(ivcInstance.inferPurposeFromPath('/random/image.png'))
          .toBe('Imported image');
      });
    });
  });
});