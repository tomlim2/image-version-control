import { 
  Project, 
  ProjectCreationOptions, 
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
      lastAccessed: now
    };

    // Save project
    await this.storage.saveProject(project);

    // Create initial tree if specified
    if (options.initialTree) {
      const treeManager = new TreeManager(this.storage);
      await treeManager.createTree({
        ...options.initialTree,
        projectId
      });
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
   * Update project last accessed time
   */
  async refreshProjectAccess(): Promise<Project> {
    return await this.storage.updateProject({
      lastAccessed: new Date()
    });
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

      // Project validation complete - no settings to check in simplified structure

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
    // In simplified structure, we don't have archived flag
    // This could be handled by a separate archive service or metadata
    return await this.refreshProjectAccess();
  }

  /**
   * Get suggested actions for the project
   */
  async getSuggestedActions(): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      const [trees, allNodes] = await Promise.all([
        this.storage.loadAllTrees(),
        this.storage.loadAllNodes()
      ]);

      // No trees yet
      if (trees.length === 0) {
        suggestions.push('Create your first tree with: pixtree tree create "My First Tree"');
      }

      // No images yet
      if (allNodes.length === 0) {
        suggestions.push('Generate your first image with: pixtree generate "your prompt here"');
      }

      // No favorites yet but has images
      const favoriteCount = allNodes.filter(node => node.userSettings.favorite).length;
      if (allNodes.length > 0 && favoriteCount === 0) {
        suggestions.push('Mark your best images as favorites with: pixtree tag <node-id> --favorite');
      }

      // Low rating usage
      const ratedImages = allNodes.filter(node => node.userSettings.rating && node.userSettings.rating > 0).length;
      
      if (allNodes.length > 5 && ratedImages / allNodes.length < 0.3) {
        suggestions.push('Consider rating your images to track quality: pixtree tag <node-id> --rating 1-5');
      }

      // Multiple unorganized trees
      if (trees.length > 3) {
        const untaggedTrees = trees.filter((tree: any) => tree.tags.length === 0);
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