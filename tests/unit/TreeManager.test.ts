import { jest } from '@jest/globals';
import { TreeManager } from '../../packages/core/src/managers/TreeManager.js';
import { StorageManager } from '../../packages/core/src/storage/StorageManager.js';
import { 
  Tree, 
  TreeCreationOptions, 
  ImageNode,
  TreeType,
  TreeStats 
} from '../../packages/core/src/types/index.js';

jest.mock('../../packages/core/src/storage/StorageManager.js');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: () => 'abc123' }))
}));

describe('TreeManager', () => {
  let treeManager: TreeManager;
  let mockStorage: jest.Mocked<StorageManager>;

  const mockTree: Tree = {
    id: 'tree-test-123',
    projectId: 'proj-test-456',
    name: 'Test Tree',
    description: 'A test tree',
    type: 'creative',
    createdAt: new Date('2024-01-01'),
    lastAccessed: new Date('2024-01-02'),
    tags: ['nature', 'landscape'],
    metadata: {
      totalNodes: 5,
      maxDepth: 3,
      totalSize: 1024000,
      favoriteCount: 2,
      avgRating: 4.2
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
      popularTags: { 'nature': 3, 'sunset': 2 }
    },
    rootNodeId: 'node-root-123'
  };

  const mockRootNode: ImageNode = {
    id: 'node-root-123',
    projectId: 'proj-test-456',
    treeId: 'tree-test-123',
    parentId: null,
    prompt: 'Root prompt',
    imagePath: '/path/to/root.png',
    modelUsed: 'nano-banana',
    createdAt: new Date('2024-01-01'),
    lastAccessed: new Date('2024-01-02'),
    metadata: {
      fileSize: 512000,
      dimensions: { width: 1024, height: 1024 },
      format: 'png',
      colorSpace: 'srgb',
      hasAlpha: true
    },
    tags: ['nature'],
    children: ['node-child-1', 'node-child-2'],
    isFavorite: true,
    rating: 5,
    treePosition: { depth: 0, branch: 0 },
    analysis: {
      description: 'A beautiful landscape',
      tags: ['nature', 'landscape'],
      mood: 'peaceful',
      composition: 'rule-of-thirds',
      colors: ['green', 'blue'],
      objects: ['tree', 'mountain']
    }
  };

  const mockChildNodes: ImageNode[] = [
    {
      ...mockRootNode,
      id: 'node-child-1',
      parentId: 'node-root-123',
      prompt: 'Child prompt 1',
      imagePath: '/path/to/child1.png',
      children: [],
      treePosition: { depth: 1, branch: 0 },
      isFavorite: false,
      rating: 4
    },
    {
      ...mockRootNode,
      id: 'node-child-2',
      parentId: 'node-root-123',
      prompt: 'Child prompt 2',
      imagePath: '/path/to/child2.png',
      children: [],
      treePosition: { depth: 1, branch: 1 },
      isFavorite: true,
      rating: 3
    }
  ];

  const mockTreeStats: TreeStats = {
    totalNodes: 3,
    maxDepth: 1,
    totalSize: 1536000,
    favoriteCount: 2,
    avgRating: 4.0,
    modelUsage: { 'nano-banana': 3 },
    tagUsage: { 'nature': 3, 'landscape': 1 },
    generationCount: 3,
    importCount: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStorage = {
      saveTree: jest.fn(),
      loadTree: jest.fn(),
      updateTree: jest.fn(),
      saveImageNode: jest.fn(),
      loadImageNode: jest.fn(),
      loadTreeNodes: jest.fn(),
      getTreeStats: jest.fn(),
      searchNodes: jest.fn(),
      loadAllTrees: jest.fn()
    } as any;

    treeManager = new TreeManager(mockStorage);
  });

  describe('createTree', () => {
    it('should create a tree with basic options', async () => {
      const options: TreeCreationOptions = {
        projectId: 'proj-test-456',
        name: 'New Tree',
        description: 'A new test tree',
        type: 'creative'
      };

      mockStorage.saveTree.mockResolvedValue();
      mockStorage.saveImageNode.mockResolvedValue();

      const result = await treeManager.createTree(options);

      expect(result.name).toBe('New Tree');
      expect(result.description).toBe('A new test tree');
      expect(result.type).toBe('creative');
      expect(result.projectId).toBe('proj-test-456');
      expect(result.id).toMatch(/^tree-/);
      expect(result.rootNodeId).toMatch(/^node-/);
      expect(result.settings.defaultModel).toBe('nano-banana');
      expect(mockStorage.saveTree).toHaveBeenCalledWith(result);
      expect(mockStorage.saveImageNode).toHaveBeenCalled();
    });

    it('should create tree with custom settings', async () => {
      const options: TreeCreationOptions = {
        projectId: 'proj-test-456',
        name: 'Custom Tree',
        type: 'reference',
        defaultModel: 'custom-model',
        autoTagging: false,
        maxBranching: 5
      };

      mockStorage.saveTree.mockResolvedValue();
      mockStorage.saveImageNode.mockResolvedValue();

      const result = await treeManager.createTree(options);

      expect(result.type).toBe('reference');
      expect(result.settings.defaultModel).toBe('custom-model');
      expect(result.settings.autoTagging).toBe(false);
      expect(result.settings.maxBranching).toBe(5);
    });

    it('should create tree with initial root prompt', async () => {
      const options: TreeCreationOptions = {
        projectId: 'proj-test-456',
        name: 'Tree with Root',
        type: 'creative',
        rootPrompt: 'Initial root prompt'
      };

      mockStorage.saveTree.mockResolvedValue();
      mockStorage.saveImageNode.mockResolvedValue();

      await treeManager.createTree(options);

      const saveNodeCall = mockStorage.saveImageNode.mock.calls[0][0];
      expect(saveNodeCall.prompt).toBe('Initial root prompt');
    });
  });

  describe('getTree', () => {
    it('should load tree and update access time', async () => {
      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.updateTree.mockResolvedValue(mockTree);

      const result = await treeManager.getTree('tree-test-123');

      expect(result).toBe(mockTree);
      expect(mockStorage.loadTree).toHaveBeenCalledWith('tree-test-123');
      expect(mockStorage.updateTree).toHaveBeenCalledWith('tree-test-123', {
        lastAccessed: expect.any(Date)
      });
    });
  });

  describe('updateTree', () => {
    it('should update tree with provided changes', async () => {
      const updates = { name: 'Updated Tree Name' };
      mockStorage.updateTree.mockResolvedValue({ ...mockTree, ...updates });

      const result = await treeManager.updateTree('tree-test-123', updates);

      expect(mockStorage.updateTree).toHaveBeenCalledWith('tree-test-123', updates);
      expect(result.name).toBe('Updated Tree Name');
    });
  });

  describe('getTreeStructure', () => {
    it('should return complete tree structure', async () => {
      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue([mockRootNode, ...mockChildNodes]);

      const result = await treeManager.getTreeStructure('tree-test-123');

      expect(result.tree).toBe(mockTree);
      expect(result.nodes).toHaveLength(3);
      expect(result.rootNode).toBe(mockRootNode);
      expect(mockStorage.loadTree).toHaveBeenCalledWith('tree-test-123');
      expect(mockStorage.loadTreeNodes).toHaveBeenCalledWith('tree-test-123');
    });

    it('should handle tree with no nodes', async () => {
      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue([]);

      const result = await treeManager.getTreeStructure('tree-test-123');

      expect(result.tree).toBe(mockTree);
      expect(result.nodes).toHaveLength(0);
      expect(result.rootNode).toBeUndefined();
    });
  });

  describe('getTreeStatistics', () => {
    it('should return tree statistics', async () => {
      mockStorage.getTreeStats.mockResolvedValue(mockTreeStats);

      const result = await treeManager.getTreeStatistics('tree-test-123');

      expect(result).toBe(mockTreeStats);
      expect(mockStorage.getTreeStats).toHaveBeenCalledWith('tree-test-123');
    });
  });

  describe('refreshTreeMetadata', () => {
    it('should refresh tree metadata based on current nodes', async () => {
      mockStorage.loadTreeNodes.mockResolvedValue([mockRootNode, ...mockChildNodes]);
      mockStorage.getTreeStats.mockResolvedValue(mockTreeStats);
      mockStorage.updateTree.mockResolvedValue({
        ...mockTree,
        metadata: expect.any(Object),
        stats: expect.any(Object)
      });

      const result = await treeManager.refreshTreeMetadata('tree-test-123');

      expect(mockStorage.loadTreeNodes).toHaveBeenCalledWith('tree-test-123');
      expect(mockStorage.getTreeStats).toHaveBeenCalledWith('tree-test-123');
      
      const updateCall = mockStorage.updateTree.mock.calls[0][1];
      expect(updateCall.metadata?.totalNodes).toBe(3);
      expect(updateCall.metadata?.maxDepth).toBe(1);
      expect(updateCall.metadata?.favoriteCount).toBe(2);
    });

    it('should calculate max depth correctly', async () => {
      const deepNodes = [
        mockRootNode,
        { ...mockChildNodes[0], treePosition: { depth: 1, branch: 0 } },
        { ...mockChildNodes[1], id: 'node-deep', treePosition: { depth: 2, branch: 0 } }
      ];

      mockStorage.loadTreeNodes.mockResolvedValue(deepNodes);
      mockStorage.getTreeStats.mockResolvedValue(mockTreeStats);
      mockStorage.updateTree.mockResolvedValue(mockTree);

      await treeManager.refreshTreeMetadata('tree-test-123');

      const updateCall = mockStorage.updateTree.mock.calls[0][1];
      expect(updateCall.metadata?.maxDepth).toBe(2);
    });
  });

  describe('searchInTree', () => {
    it('should search nodes within tree', async () => {
      mockStorage.searchNodes.mockResolvedValue([mockRootNode]);

      const result = await treeManager.searchInTree('tree-test-123', 'nature');

      expect(result).toEqual([mockRootNode]);
      expect(mockStorage.searchNodes).toHaveBeenCalledWith({
        query: 'nature',
        treeId: 'tree-test-123'
      });
    });

    it('should search with filters', async () => {
      const filters = { 
        tags: ['landscape'], 
        rating: 4,
        isFavorite: true
      };

      mockStorage.searchNodes.mockResolvedValue([mockRootNode]);

      const result = await treeManager.searchInTree('tree-test-123', 'nature', filters);

      expect(result).toEqual([mockRootNode]);
      expect(mockStorage.searchNodes).toHaveBeenCalledWith({
        query: 'nature',
        treeId: 'tree-test-123',
        ...filters
      });
    });
  });

  describe('getTreeRecommendations', () => {
    it('should recommend creating first node when tree is empty', async () => {
      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue([]);
      mockStorage.getTreeStats.mockResolvedValue({ ...mockTreeStats, totalNodes: 0 });

      const result = await treeManager.getTreeRecommendations('tree-test-123');

      expect(result).toContain('This tree is empty. Generate your first image with: pixtree generate "your prompt"');
    });

    it('should recommend branching when tree is linear', async () => {
      const linearNodes = [
        mockRootNode,
        { ...mockChildNodes[0], children: ['node-child-2'] },
        { ...mockChildNodes[1], parentId: 'node-child-1', children: [] }
      ];

      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue(linearNodes);
      mockStorage.getTreeStats.mockResolvedValue({ ...mockTreeStats, totalNodes: 3, maxDepth: 2 });

      const result = await treeManager.getTreeRecommendations('tree-test-123');

      expect(result).toContain('Your tree is quite linear. Try branching from existing nodes to explore variations.');
    });

    it('should recommend adding favorites when none exist', async () => {
      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue([mockRootNode, ...mockChildNodes]);
      mockStorage.getTreeStats.mockResolvedValue({ 
        ...mockTreeStats, 
        favoriteCount: 0,
        totalNodes: 5
      });

      const result = await treeManager.getTreeRecommendations('tree-test-123');

      expect(result).toContain('No favorites marked yet. Use pixtree tag <node-id> --favorite to mark your best results.');
    });

    it('should recommend rating when few images are rated', async () => {
      const unratedNodes = [
        mockRootNode,
        { ...mockChildNodes[0], rating: 0 },
        { ...mockChildNodes[1], rating: 0 }
      ];

      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue(unratedNodes);
      mockStorage.getTreeStats.mockResolvedValue({ ...mockTreeStats, avgRating: 1.7 });

      const result = await treeManager.getTreeRecommendations('tree-test-123');

      expect(result).toContain('Consider rating your images: pixtree tag <node-id> --rating 1-5');
    });

    it('should recommend tagging when few nodes have tags', async () => {
      const untaggedNodes = [
        { ...mockRootNode, tags: [] },
        { ...mockChildNodes[0], tags: [] },
        { ...mockChildNodes[1], tags: ['nature'] }
      ];

      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue(untaggedNodes);
      mockStorage.getTreeStats.mockResolvedValue(mockTreeStats);

      const result = await treeManager.getTreeRecommendations('tree-test-123');

      expect(result).toContain('Many nodes lack tags. Add tags for better organization: pixtree tag <node-id> "tag1,tag2"');
    });

    it('should recommend pruning when tree is too deep', async () => {
      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue([mockRootNode, ...mockChildNodes]);
      mockStorage.getTreeStats.mockResolvedValue({ ...mockTreeStats, maxDepth: 8 });

      const result = await treeManager.getTreeRecommendations('tree-test-123');

      expect(result).toContain('Tree is getting deep (8 levels). Consider pruning or starting a new tree for different directions.');
    });
  });

  describe('validateTreeIntegrity', () => {
    it('should return valid for a proper tree', async () => {
      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue([mockRootNode, ...mockChildNodes]);
      mockStorage.loadImageNode.mockResolvedValue(mockRootNode);

      const result = await treeManager.validateTreeIntegrity('tree-test-123');

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing root node', async () => {
      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue(mockChildNodes);
      mockStorage.loadImageNode.mockRejectedValue(new Error('Node not found'));

      const result = await treeManager.validateTreeIntegrity('tree-test-123');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Root node node-root-123 not found');
    });

    it('should detect orphaned nodes', async () => {
      const orphanedNode = {
        ...mockChildNodes[0],
        parentId: 'non-existent-parent'
      };

      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue([mockRootNode, orphanedNode]);
      mockStorage.loadImageNode.mockResolvedValue(mockRootNode);

      const result = await treeManager.validateTreeIntegrity('tree-test-123');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Orphaned node: node-child-1 (parent non-existent-parent not found)');
    });

    it('should detect invalid child references', async () => {
      const nodeWithBadChild = {
        ...mockRootNode,
        children: ['node-child-1', 'non-existent-child']
      };

      mockStorage.loadTree.mockResolvedValue(mockTree);
      mockStorage.loadTreeNodes.mockResolvedValue([nodeWithBadChild, mockChildNodes[0]]);
      mockStorage.loadImageNode.mockResolvedValue(nodeWithBadChild);

      const result = await treeManager.validateTreeIntegrity('tree-test-123');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Invalid child reference: node-root-123 → non-existent-child');
    });

    it('should handle validation errors', async () => {
      mockStorage.loadTree.mockRejectedValue(new Error('Tree not found'));

      const result = await treeManager.validateTreeIntegrity('tree-test-123');

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Tree integrity validation failed: Tree not found');
    });
  });

  describe('getTreesByType', () => {
    it('should filter trees by type', async () => {
      const creativeTrees = [mockTree];
      const referenceTrees = [{ ...mockTree, id: 'tree-ref-1', type: 'reference' as TreeType }];
      const allTrees = [...creativeTrees, ...referenceTrees];

      mockStorage.loadAllTrees.mockResolvedValue(allTrees);

      const result = await treeManager.getTreesByType('creative');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('creative');
    });

    it('should return empty array when no trees match type', async () => {
      mockStorage.loadAllTrees.mockResolvedValue([mockTree]);

      const result = await treeManager.getTreesByType('experiment');

      expect(result).toHaveLength(0);
    });
  });

  describe('generateTreeId', () => {
    it('should generate unique tree IDs', async () => {
      const options: TreeCreationOptions = {
        projectId: 'proj-test',
        name: 'Test',
        type: 'creative'
      };
      
      mockStorage.saveTree.mockResolvedValue();
      mockStorage.saveImageNode.mockResolvedValue();

      const tree1 = await treeManager.createTree(options);
      const tree2 = await treeManager.createTree(options);

      expect(tree1.id).toMatch(/^tree-/);
      expect(tree2.id).toMatch(/^tree-/);
      expect(tree1.id).not.toBe(tree2.id);
    });
  });

  describe('generateNodeId', () => {
    it('should generate unique node IDs', async () => {
      const options: TreeCreationOptions = {
        projectId: 'proj-test',
        name: 'Test',
        type: 'creative'
      };
      
      mockStorage.saveTree.mockResolvedValue();
      mockStorage.saveImageNode.mockResolvedValue();

      const tree1 = await treeManager.createTree(options);
      const tree2 = await treeManager.createTree(options);

      expect(tree1.rootNodeId).toMatch(/^node-/);
      expect(tree2.rootNodeId).toMatch(/^node-/);
      expect(tree1.rootNodeId).not.toBe(tree2.rootNodeId);
    });
  });
});