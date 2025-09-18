import { 
  Project, 
  ProjectCreationOptions, 
  ProjectStats,
  WorkspaceContext 
} from '../types/index.js';
import { StorageManager } from '../storage/StorageManager.js';
import { TreeManager } from './TreeManager.js';
import crypto from 'crypto';

/**
 * Manages project-level operations and metadata
 */
export class ProjectManager {
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  /**
   * Create a new project with optional initial tree
   */
  async createProject(options: ProjectCreationOptions): Promise<Project> {
    const projectId = this.generateProjectId();
    const now = new Date();

    const project: Project = {
      id: projectId,
      name: options.name,
      description: options.description,
      createdAt: now,
      lastAccessed: now,
      metadata: {
        totalTrees: 0,
        totalImages: 0,
        totalSize: 0,
        tags: [],
        favoriteCount: 0,
        avgRating: 0
      },
      settings: {
        defaultModel: options.defaultModel || 'nano-banana',
        autoTagging: false,
        autoAnalysis: false,
        defaultTreeOnImport: '' // Will be set after creating initial tree
      },
      stats: {
        totalGenerations: 0,
        totalImports: 0,
        lastActivity: now,
        mostUsedModels: {},
        topTags: {}
      }
    };

    // Save project
    await this.storage.saveProject(project);

    // Create initial tree if specified
    if (options.initialTree) {
      const treeManager = new TreeManager(this.storage);
      const initialTree = await treeManager.createTree({
        ...options.initialTree,
        projectId
      });

      // Update project with default tree for imports
      project.settings.defaultTreeOnImport = initialTree.id;
      project.metadata.totalTrees = 1;
      await this.storage.saveProject(project);
    }

    // Project is automatically current in single project mode

    return project;
  }

  /**
   * Load project and update access time
   */
  async getProject(): Promise<Project> {
    const project = await this.storage.loadProject();
    
    // Update last accessed time
    await this.storage.updateProject({
      lastAccessed: new Date()
    });

    return project;
  }

  /**
   * Update project metadata and settings
   */
  async updateProject(updates: Partial<Project>): Promise<Project> {
    return await this.storage.updateProject(updates);
  }

  /**
   * Get comprehensive project statistics
   */
  async getProjectStatistics(): Promise<ProjectStats> {
    return await this.storage.getProjectStats();
  }

  /**
   * Update project metadata based on current state
   */
  async refreshProjectMetadata(): Promise<Project> {
    const [trees, stats] = await Promise.all([
      this.storage.loadAllTrees(),
      this.storage.getProjectStats()
    ]);

    // Calculate aggregated metadata
    const allTags = new Set<string>();
    trees.forEach(tree => {
      tree.tags.forEach(tag => allTags.add(tag));
    });

    const updates: Partial<Project> = {
      metadata: {
        totalTrees: trees.length,
        totalImages: stats.totalImages,
        totalSize: stats.totalSize,
        tags: Array.from(allTags),
        favoriteCount: stats.favoriteCount,
        avgRating: Object.entries(stats.imagesByRating)
          .reduce((sum, [rating, count]) => sum + (parseInt(rating) * count), 0) / stats.totalImages || 0
      },
      stats: {
        totalGenerations: Object.values(stats.imagesByModel).reduce((sum, count) => sum + count, 0),
        totalImports: stats.totalImages - Object.values(stats.imagesByModel).reduce((sum, count) => sum + count, 0),
        lastActivity: new Date(),
        mostUsedModels: stats.imagesByModel,
        topTags: stats.tagUsage
      }
    };

    return await this.storage.updateProject(updates);
  }

  /**
   * Get project workspace context
   */
  async getWorkspaceContext(): Promise<WorkspaceContext> {
    return await this.storage.loadContext();
  }

  /**
   * Initialize project in workspace context
   */
  async initializeInContext(_project: Project): Promise<void> {
    // Single project mode - no context switching needed
  }

  /**
   * Check if project is properly initialized
   */
  async validateProject(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const project = await this.storage.loadProject();
      
      // Check required fields
      if (!project.id) issues.push('Project missing ID');
      if (!project.name) issues.push('Project missing name');
      
      // Check if trees directory exists
      const trees = await this.storage.loadAllTrees();
      if (trees.length === 0) {
        issues.push('Project has no trees - consider creating an initial tree');
      }

      // Check if default tree for imports exists
      if (project.settings.defaultTreeOnImport) {
        try {
          await this.storage.loadTree(project.settings.defaultTreeOnImport);
        } catch {
          issues.push('Default import tree no longer exists');
        }
      }

    } catch (error) {
      issues.push(`Project validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate unique project ID
   */
  private generateProjectId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `proj-${timestamp}-${random}`;
  }

  /**
   * Archive project (mark as archived, don't delete)
   */
  async archiveProject(): Promise<Project> {
    const project = await this.storage.loadProject();
    
    // Add archived flag to project metadata
    const updates: Partial<Project> = {
      settings: {
        ...project.settings,
        archived: true
      } as any
    };

    return await this.storage.updateProject(updates);
  }

  /**
   * Get suggested actions for the project
   */
  async getSuggestedActions(): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      const [project, trees, stats] = await Promise.all([
        this.storage.loadProject(),
        this.storage.loadAllTrees(),
        this.storage.getProjectStats()
      ]);

      // No trees yet
      if (trees.length === 0) {
        suggestions.push('Create your first tree with: pixtree tree create "My First Tree" --type creative');
      }

      // No images yet
      if (stats.totalImages === 0) {
        suggestions.push('Generate your first image with: pixtree generate "your prompt here"');
      }

      // No favorites yet but has images
      if (stats.totalImages > 0 && stats.favoriteCount === 0) {
        suggestions.push('Mark your best images as favorites with: pixtree tag <node-id> --favorite');
      }

      // Low rating usage
      const ratedImages = Object.entries(stats.imagesByRating)
        .filter(([rating]) => parseInt(rating) > 0)
        .reduce((sum, [, count]) => sum + count, 0);
      
      if (stats.totalImages > 5 && ratedImages / stats.totalImages < 0.3) {
        suggestions.push('Consider rating your images to track quality: pixtree tag <node-id> --rating 1-5');
      }

      // Multiple unorganized trees
      if (trees.length > 3) {
        const untaggedTrees = trees.filter(tree => tree.tags.length === 0);
        if (untaggedTrees.length > trees.length * 0.5) {
          suggestions.push('Add tags to your trees for better organization: pixtree tree tag <tree-id> "tag1,tag2"');
        }
      }

    } catch (error) {
      suggestions.push('Run pixtree init to properly initialize your project');
    }

    return suggestions;
  }
}