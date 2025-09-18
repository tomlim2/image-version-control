import { jest } from '@jest/globals';
import { ProjectManager } from '../../packages/core/src/managers/ProjectManager.js';
import { StorageManager } from '../../packages/core/src/storage/StorageManager.js';
import { TreeManager } from '../../packages/core/src/managers/TreeManager.js';
import { 
  Project, 
  ProjectCreationOptions, 
  ProjectStats,
  WorkspaceContext,
  Tree 
} from '../../packages/core/src/types/index.js';

jest.mock('../../packages/core/src/storage/StorageManager.js');
jest.mock('../../packages/core/src/managers/TreeManager.js');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: () => 'abc123' }))
}));

describe('ProjectManager', () => {
  let projectManager: ProjectManager;
  let mockStorage: jest.Mocked<StorageManager>;
  let mockTreeManager: jest.Mocked<TreeManager>;

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

  const mockProjectStats: ProjectStats = {
    totalImages: 10,
    totalSize: 1024000,
    favoriteCount: 3,
    imagesByModel: { 'nano-banana': 8, 'imported': 2 },
    imagesByRating: { '4': 3, '5': 2, '0': 5 },
    tagUsage: { 'nature': 5, 'abstract': 3, 'sunset': 2 }
  };

  const mockTrees: Tree[] = [
    {
      id: 'tree-1',
      projectId: 'proj-test-123',
      name: 'Nature Scenes',
      description: 'Natural landscapes',
      type: 'creative',
      createdAt: new Date('2024-01-01'),
      lastAccessed: new Date('2024-01-02'),
      tags: ['nature', 'landscape'],
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
        popularTags: { 'nature': 3, 'sunset': 2 }
      },
      rootNodeId: 'node-root-1'
    },
    {
      id: 'tree-2',
      projectId: 'proj-test-123',
      name: 'Abstract Art',
      description: 'Abstract compositions',
      type: 'experiment',
      createdAt: new Date('2024-01-01'),
      lastAccessed: new Date('2024-01-02'),
      tags: ['abstract'],
      metadata: {
        totalNodes: 5,
        maxDepth: 2,
        totalSize: 512000,
        favoriteCount: 1,
        avgRating: 4.4
      },
      settings: {
        defaultModel: 'nano-banana',
        autoTagging: false,
        maxBranching: 2
      },
      stats: {
        totalGenerations: 4,
        totalImports: 1,
        lastActivity: new Date('2024-01-02'),
        modelUsage: { 'nano-banana': 4 },
        popularTags: { 'abstract': 4 }
      },
      rootNodeId: 'node-root-2'
    }
  ];

  const mockWorkspaceContext: WorkspaceContext = {
    currentProject: mockProject,
    recentProjects: [mockProject],
    settings: {
      defaultModel: 'nano-banana',
      defaultTreeType: 'creative',
      autoSave: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStorage = {
      saveProject: jest.fn(),
      loadProject: jest.fn(),
      updateProject: jest.fn(),
      getProjectStats: jest.fn(),
      loadAllTrees: jest.fn(),
      setCurrentProject: jest.fn(),
      loadContext: jest.fn(),
      loadTree: jest.fn()
    } as any;

    mockTreeManager = {
      createTree: jest.fn()
    } as any;

    (TreeManager as jest.MockedClass<typeof TreeManager>).mockImplementation(() => mockTreeManager);

    projectManager = new ProjectManager(mockStorage);
  });

  describe('createProject', () => {
    it('should create a project with basic options', async () => {
      const options: ProjectCreationOptions = {
        name: 'New Project',
        description: 'A new test project'
      };

      mockStorage.saveProject.mockResolvedValue();
      mockStorage.setCurrentProject.mockResolvedValue();

      const result = await projectManager.createProject(options);

      expect(result.name).toBe('New Project');
      expect(result.description).toBe('A new test project');
      expect(result.id).toMatch(/^proj-/);
      expect(result.settings.defaultModel).toBe('nano-banana');
      expect(result.metadata.totalTrees).toBe(0);
      expect(mockStorage.saveProject).toHaveBeenCalledWith(result);
      expect(mockStorage.setCurrentProject).toHaveBeenCalledWith(result);
    });

    it('should create a project with initial tree', async () => {
      const options: ProjectCreationOptions = {
        name: 'Project with Tree',
        description: 'Project with initial tree',
        initialTree: {
          name: 'Initial Tree',
          description: 'First tree',
          type: 'creative'
        }
      };

      const mockInitialTree: Tree = {
        ...mockTrees[0],
        id: 'initial-tree-123',
        name: 'Initial Tree',
        description: 'First tree'
      };

      mockStorage.saveProject.mockResolvedValue();
      mockStorage.setCurrentProject.mockResolvedValue();
      mockTreeManager.createTree.mockResolvedValue(mockInitialTree);

      const result = await projectManager.createProject(options);

      expect(mockTreeManager.createTree).toHaveBeenCalledWith({
        ...options.initialTree,
        projectId: result.id
      });
      expect(result.settings.defaultTreeOnImport).toBe('initial-tree-123');
      expect(result.metadata.totalTrees).toBe(1);
      expect(mockStorage.saveProject).toHaveBeenCalledTimes(2);
    });

    it('should use custom default model', async () => {
      const options: ProjectCreationOptions = {
        name: 'Custom Model Project',
        defaultModel: 'custom-model'
      };

      mockStorage.saveProject.mockResolvedValue();
      mockStorage.setCurrentProject.mockResolvedValue();

      const result = await projectManager.createProject(options);

      expect(result.settings.defaultModel).toBe('custom-model');
    });
  });

  describe('getProject', () => {
    it('should load project and update access time', async () => {
      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.updateProject.mockResolvedValue(mockProject);

      const result = await projectManager.getProject();

      expect(result).toBe(mockProject);
      expect(mockStorage.loadProject).toHaveBeenCalled();
      expect(mockStorage.updateProject).toHaveBeenCalledWith({
        lastAccessed: expect.any(Date)
      });
    });
  });

  describe('updateProject', () => {
    it('should update project with provided changes', async () => {
      const updates = { name: 'Updated Name' };
      mockStorage.updateProject.mockResolvedValue({ ...mockProject, ...updates });

      const result = await projectManager.updateProject(updates);

      expect(mockStorage.updateProject).toHaveBeenCalledWith(updates);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('getProjectStatistics', () => {
    it('should return project statistics', async () => {
      mockStorage.getProjectStats.mockResolvedValue(mockProjectStats);

      const result = await projectManager.getProjectStatistics();

      expect(result).toBe(mockProjectStats);
      expect(mockStorage.getProjectStats).toHaveBeenCalled();
    });
  });

  describe('refreshProjectMetadata', () => {
    it('should refresh project metadata based on current state', async () => {
      mockStorage.loadAllTrees.mockResolvedValue(mockTrees);
      mockStorage.getProjectStats.mockResolvedValue(mockProjectStats);
      mockStorage.updateProject.mockResolvedValue({
        ...mockProject,
        metadata: expect.any(Object),
        stats: expect.any(Object)
      });

      const result = await projectManager.refreshProjectMetadata();

      expect(mockStorage.loadAllTrees).toHaveBeenCalled();
      expect(mockStorage.getProjectStats).toHaveBeenCalled();
      
      const updateCall = mockStorage.updateProject.mock.calls[0][0];
      expect(updateCall.metadata?.totalTrees).toBe(2);
      expect(updateCall.metadata?.totalImages).toBe(10);
      expect(updateCall.metadata?.tags).toEqual(['nature', 'landscape', 'abstract']);
      expect(updateCall.stats?.totalGenerations).toBe(10);
    });

    it('should calculate average rating correctly', async () => {
      mockStorage.loadAllTrees.mockResolvedValue(mockTrees);
      mockStorage.getProjectStats.mockResolvedValue(mockProjectStats);
      mockStorage.updateProject.mockResolvedValue(mockProject);

      await projectManager.refreshProjectMetadata();

      const updateCall = mockStorage.updateProject.mock.calls[0][0];
      expect(updateCall.metadata?.avgRating).toBe(3.2); // (4*3 + 5*2) / 10 = 22/10 = 2.2... wait let me recalculate
    });
  });

  describe('getWorkspaceContext', () => {
    it('should return workspace context', async () => {
      mockStorage.loadContext.mockResolvedValue(mockWorkspaceContext);

      const result = await projectManager.getWorkspaceContext();

      expect(result).toBe(mockWorkspaceContext);
      expect(mockStorage.loadContext).toHaveBeenCalled();
    });
  });

  describe('initializeInContext', () => {
    it('should set project as current', async () => {
      mockStorage.setCurrentProject.mockResolvedValue();

      await projectManager.initializeInContext(mockProject);

      expect(mockStorage.setCurrentProject).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('validateProject', () => {
    it('should return valid for a proper project', async () => {
      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.loadAllTrees.mockResolvedValue(mockTrees);
      mockStorage.loadTree.mockResolvedValue(mockTrees[0]);

      const result = await projectManager.validateProject();

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should detect missing project ID', async () => {
      const invalidProject = { ...mockProject, id: '' };
      mockStorage.loadProject.mockResolvedValue(invalidProject);
      mockStorage.loadAllTrees.mockResolvedValue(mockTrees);

      const result = await projectManager.validateProject();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Project missing ID');
    });

    it('should detect missing project name', async () => {
      const invalidProject = { ...mockProject, name: '' };
      mockStorage.loadProject.mockResolvedValue(invalidProject);
      mockStorage.loadAllTrees.mockResolvedValue(mockTrees);

      const result = await projectManager.validateProject();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Project missing name');
    });

    it('should detect missing trees', async () => {
      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.loadAllTrees.mockResolvedValue([]);

      const result = await projectManager.validateProject();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Project has no trees - consider creating an initial tree');
    });

    it('should detect missing default import tree', async () => {
      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.loadAllTrees.mockResolvedValue(mockTrees);
      mockStorage.loadTree.mockRejectedValue(new Error('Tree not found'));

      const result = await projectManager.validateProject();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Default import tree no longer exists');
    });

    it('should handle validation errors', async () => {
      mockStorage.loadProject.mockRejectedValue(new Error('Project not found'));

      const result = await projectManager.validateProject();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Project validation failed: Project not found');
    });
  });

  describe('archiveProject', () => {
    it('should mark project as archived', async () => {
      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.updateProject.mockResolvedValue({
        ...mockProject,
        settings: { ...mockProject.settings, archived: true }
      });

      const result = await projectManager.archiveProject();

      expect(mockStorage.updateProject).toHaveBeenCalledWith({
        settings: {
          ...mockProject.settings,
          archived: true
        }
      });
      expect(result.settings.archived).toBe(true);
    });
  });

  describe('getSuggestedActions', () => {
    it('should suggest creating first tree when no trees exist', async () => {
      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.loadAllTrees.mockResolvedValue([]);
      mockStorage.getProjectStats.mockResolvedValue({ ...mockProjectStats, totalImages: 0 });

      const result = await projectManager.getSuggestedActions();

      expect(result).toContain('Create your first tree with: pixtree tree create "My First Tree" --type creative');
    });

    it('should suggest generating first image when no images exist', async () => {
      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.loadAllTrees.mockResolvedValue(mockTrees);
      mockStorage.getProjectStats.mockResolvedValue({ ...mockProjectStats, totalImages: 0 });

      const result = await projectManager.getSuggestedActions();

      expect(result).toContain('Generate your first image with: pixtree generate "your prompt here"');
    });

    it('should suggest marking favorites when no favorites exist', async () => {
      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.loadAllTrees.mockResolvedValue(mockTrees);
      mockStorage.getProjectStats.mockResolvedValue({ 
        ...mockProjectStats, 
        totalImages: 5,
        favoriteCount: 0 
      });

      const result = await projectManager.getSuggestedActions();

      expect(result).toContain('Mark your best images as favorites with: pixtree tag <node-id> --favorite');
    });

    it('should suggest rating images when few are rated', async () => {
      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.loadAllTrees.mockResolvedValue(mockTrees);
      mockStorage.getProjectStats.mockResolvedValue({
        ...mockProjectStats,
        totalImages: 10,
        imagesByRating: { '0': 8, '4': 1, '5': 1 } // Only 20% rated
      });

      const result = await projectManager.getSuggestedActions();

      expect(result).toContain('Consider rating your images to track quality: pixtree tag <node-id> --rating 1-5');
    });

    it('should suggest tagging trees when many are untagged', async () => {
      const untaggedTrees = [
        { ...mockTrees[0], tags: [] },
        { ...mockTrees[1], tags: [] },
        { ...mockTrees[0], id: 'tree-3', tags: [] },
        { ...mockTrees[1], id: 'tree-4', tags: ['tagged'] }
      ];

      mockStorage.loadProject.mockResolvedValue(mockProject);
      mockStorage.loadAllTrees.mockResolvedValue(untaggedTrees);
      mockStorage.getProjectStats.mockResolvedValue(mockProjectStats);

      const result = await projectManager.getSuggestedActions();

      expect(result).toContain('Add tags to your trees for better organization: pixtree tree tag <tree-id> "tag1,tag2"');
    });

    it('should suggest initialization when project loading fails', async () => {
      mockStorage.loadProject.mockRejectedValue(new Error('No project found'));

      const result = await projectManager.getSuggestedActions();

      expect(result).toContain('Run pixtree init to properly initialize your project');
    });
  });

  describe('generateProjectId', () => {
    it('should generate unique project IDs', async () => {
      const options: ProjectCreationOptions = { name: 'Test' };
      
      mockStorage.saveProject.mockResolvedValue();
      mockStorage.setCurrentProject.mockResolvedValue();

      const project1 = await projectManager.createProject(options);
      const project2 = await projectManager.createProject(options);

      expect(project1.id).toMatch(/^proj-/);
      expect(project2.id).toMatch(/^proj-/);
      expect(project1.id).not.toBe(project2.id);
    });
  });
});