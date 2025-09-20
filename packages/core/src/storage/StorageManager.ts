import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { 
  ImageNode, 
 
  Project, 
  Tree, 
  WorkspaceContext,
  SearchOptions,
  ProjectSearchOptions
} from '../types/index.js';

export class StorageManager {
  private projectPath: string;
  private pixtreePath: string;
  private imagesPath: string;
  private nodesPath: string;
  private treesPath: string;
  private projectConfigPath: string;
  private contextPath: string;
  
  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.pixtreePath = path.join(projectPath, '.pixtree');
    this.imagesPath = path.join(this.pixtreePath, 'images');
    this.nodesPath = path.join(this.pixtreePath, 'nodes');
    this.treesPath = path.join(this.pixtreePath, 'trees');
    this.projectConfigPath = path.join(this.pixtreePath, 'project.json');
    this.contextPath = path.join(this.pixtreePath, 'context.json');
  }
  
  /**
   * Initialize project structure with Project/Tree support
   */
  async createProjectStructure(): Promise<void> {
    await fs.ensureDir(this.pixtreePath);
    await fs.ensureDir(this.imagesPath);
    await fs.ensureDir(this.nodesPath);
    await fs.ensureDir(this.treesPath);
    
    // Create .gitignore for pixtree folder
    const gitignorePath = path.join(this.pixtreePath, '.gitignore');
    await fs.writeFile(gitignorePath, 'images/\n*.tmp\n*.cache\n');
    
    // Initialize empty context
    const initialContext: WorkspaceContext = {
      recentTrees: []
    };
    await this.saveContext(initialContext);
  }
  

  // ===== PROJECT MANAGEMENT =====

  /**
   * Save project metadata
   */
  async saveProject(project: Project): Promise<void> {
    await fs.writeJSON(this.projectConfigPath, project, { spaces: 2 });
  }

  /**
   * Load project metadata
   */
  async loadProject(): Promise<Project> {
    if (!(await fs.pathExists(this.projectConfigPath))) {
      throw new Error('Project metadata not found. Project may not be properly initialized.');
    }
    return await fs.readJSON(this.projectConfigPath);
  }

  /**
   * Update project metadata
   */
  async updateProject(updates: Partial<Project>): Promise<Project> {
    const project = await this.loadProject();
    const updatedProject = { ...project, ...updates, lastAccessed: new Date() };
    await this.saveProject(updatedProject);
    return updatedProject;
  }

  // ===== TREE MANAGEMENT =====

  /**
   * Save tree metadata
   */
  async saveTree(tree: Tree): Promise<void> {
    const treePath = path.join(this.treesPath, `${tree.id}.json`);
    await fs.writeJSON(treePath, tree, { spaces: 2 });
  }

  /**
   * Load tree metadata
   */
  async loadTree(treeId: string): Promise<Tree> {
    const treePath = path.join(this.treesPath, `${treeId}.json`);
    if (!(await fs.pathExists(treePath))) {
      throw new Error(`Tree not found: ${treeId}`);
    }
    return await fs.readJSON(treePath);
  }

  /**
   * Get all tree IDs
   */
  async getAllTreeIds(): Promise<string[]> {
    const files = await fs.readdir(this.treesPath);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  }

  /**
   * Load all trees
   */
  async loadAllTrees(): Promise<Tree[]> {
    const treeIds = await this.getAllTreeIds();
    const trees = await Promise.all(
      treeIds.map(id => this.loadTree(id))
    );
    return trees;
  }

  /**
   * Update tree metadata
   */
  async updateTree(treeId: string, updates: Partial<Tree>): Promise<Tree> {
    const tree = await this.loadTree(treeId);
    const updatedTree = { ...tree, ...updates, lastAccessed: new Date() };
    await this.saveTree(updatedTree);
    return updatedTree;
  }

  /**
   * Delete tree and optionally its nodes
   */
  async deleteTree(treeId: string, deleteNodes: boolean = false): Promise<void> {
    const treePath = path.join(this.treesPath, `${treeId}.json`);
    
    if (deleteNodes) {
      // Find and delete all nodes in this tree
      const allNodes = await this.loadAllNodes();
      const treeNodes = allNodes.filter(node => node.treeId === treeId);
      
      for (const node of treeNodes) {
        await this.deleteNode(node.id);
      }
    }
    
    // Remove tree metadata
    await fs.remove(treePath);
  }

  /**
   * Generate unique tree ID
   */
  generateTreeId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `tree-${timestamp}-${random}`;
  }

  // ===== CONTEXT MANAGEMENT =====

  /**
   * Save workspace context
   */
  async saveContext(context: WorkspaceContext): Promise<void> {
    await fs.writeJSON(this.contextPath, context, { spaces: 2 });
  }

  /**
   * Load workspace context
   */
  async loadContext(): Promise<WorkspaceContext> {
    if (!(await fs.pathExists(this.contextPath))) {
      return {
        recentTrees: []
      };
    }
    return await fs.readJSON(this.contextPath);
  }

  /**
   * Update workspace context
   */
  async updateContext(updates: Partial<WorkspaceContext>): Promise<WorkspaceContext> {
    const context = await this.loadContext();
    const updatedContext = { ...context, ...updates };
    await this.saveContext(updatedContext);
    return updatedContext;
  }


  /**
   * Set current tree context
   */
  async setCurrentTree(tree: Tree): Promise<void> {
    const context = await this.loadContext();
    
    // Update recent trees list
    const recentTrees = [tree, ...context.recentTrees.filter(t => t.id !== tree.id)].slice(0, 10);
    
    await this.updateContext({
      currentTree: tree,
      recentTrees,
      currentNode: undefined // Reset node when switching trees
    });
  }
  
  /**
   * Save image data and return hash
   */
  async saveImage(imageData: Buffer, nodeId: string): Promise<{ imagePath: string; imageHash: string }> {
    const imageHash = this.generateImageHash(imageData);
    const imagePath = path.join(this.imagesPath, `${imageHash}.png`);
    
    // Only save if doesn't exist (deduplication)
    if (!(await fs.pathExists(imagePath))) {
      await fs.writeFile(imagePath, imageData);
    }
    
    return {
      imagePath: path.relative(this.projectPath, imagePath),
      imageHash
    };
  }
  
  /**
   * Load image data by hash
   */
  async loadImage(imageHash: string): Promise<Buffer> {
    const imagePath = path.join(this.imagesPath, `${imageHash}.png`);
    if (!(await fs.pathExists(imagePath))) {
      throw new Error(`Image not found: ${imageHash}`);
    }
    return await fs.readFile(imagePath);
  }
  
  /**
   * Save node metadata
   */
  async saveNode(node: ImageNode): Promise<void> {
    const nodePath = path.join(this.nodesPath, `${node.id}.json`);
    await fs.writeJSON(nodePath, node, { spaces: 2 });
  }
  
  /**
   * Load node metadata
   */
  async loadNode(nodeId: string): Promise<ImageNode> {
    const nodePath = path.join(this.nodesPath, `${nodeId}.json`);
    if (!(await fs.pathExists(nodePath))) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    return await fs.readJSON(nodePath);
  }
  
  /**
   * Get all node IDs
   */
  async getAllNodeIds(): Promise<string[]> {
    const files = await fs.readdir(this.nodesPath);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  }
  
  /**
   * Load all nodes
   */
  async loadAllNodes(): Promise<ImageNode[]> {
    const nodeIds = await this.getAllNodeIds();
    const nodes = await Promise.all(
      nodeIds.map(id => this.loadNode(id))
    );
    return nodes;
  }
  
  /**
   * Delete node and its image (if not referenced by others)
   */
  async deleteNode(nodeId: string): Promise<void> {
    const node = await this.loadNode(nodeId);
    const nodePath = path.join(this.nodesPath, `${nodeId}.json`);
    
    // Remove node metadata
    await fs.remove(nodePath);
    
    // Check if image is referenced by other nodes
    const allNodes = await this.loadAllNodes();
    const isImageReferenced = allNodes.some(n => 
      n.id !== nodeId && n.imageHash === node.imageHash
    );
    
    // Delete image if not referenced
    if (!isImageReferenced && node.model) {
      const imagePath = path.join(this.projectPath, node.imagePath);
      if (await fs.pathExists(imagePath)) {
        await fs.remove(imagePath);
      }
    }
  }
  
  /**
   * Set current working node
   */
  async setCurrentNode(nodeId: string): Promise<void> {
    const node = await this.loadNode(nodeId);
    const context = await this.loadContext();
    
    await this.updateContext({
      currentNode: node
    });
  }
  
  /**
   * Get current working node
   */
  async getCurrentNode(): Promise<ImageNode | null> {
    const context = await this.loadContext();
    return context.currentNode || null;
  }
  
  /**
   * Generate unique node ID
   */
  generateNodeId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `node-${timestamp}-${random}`;
  }
  
  /**
   * Generate image hash for deduplication
   */
  generateImageHash(imageData: Buffer): string {
    return crypto.createHash('sha256').update(imageData).digest('hex').substring(0, 16);
  }
  
  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalImages: number;
    totalNodes: number;
    totalSize: number;
    imagesByRating: Record<number, number>;
  }> {
    const nodes = await this.loadAllNodes();
    const imageFiles = await fs.readdir(this.imagesPath);
    
    let totalSize = 0;
    for (const file of imageFiles) {
      const filePath = path.join(this.imagesPath, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }
    
    const imagesByRating: Record<number, number> = {};
    nodes.forEach(node => {
      const rating = node.userSettings.rating || 0;
      imagesByRating[rating] = (imagesByRating[rating] || 0) + 1;
    });
    
    return {
      totalImages: imageFiles.length,
      totalNodes: nodes.length,
      totalSize,
      imagesByRating
    };
  }
  
  /**
   * Search nodes by tags, text, or other criteria
   */
  async searchNodes(query: {
    tags?: string[];
    text?: string;
    rating?: number;
    minRating?: number;
    model?: string;
    dateRange?: { from?: Date; to?: Date };
  }): Promise<ImageNode[]> {
    const allNodes = await this.loadAllNodes();
    
    return allNodes.filter(node => {
      // Tag filter
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag => 
          node.tags.includes(tag)
        );
        if (!hasAllTags) return false;
      }
      
      // Text search in prompt, notes, description
      if (query.text) {
        const searchText = query.text.toLowerCase();
        const searchFields = [
          this.getNodePrompt(node),
          node.userSettings.description || '',
          ...node.tags
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(searchText)) return false;
      }
      
      // Rating filters
      if (query.rating !== undefined && node.userSettings.rating !== query.rating) {
        return false;
      }
      if (query.minRating !== undefined && (node.userSettings.rating || 0) < query.minRating) {
        return false;
      }
      
      // Model filter
      if (query.model && node.model !== query.model) {
        return false;
      }
      
      // Date range filter
      if (query.dateRange) {
        const nodeDate = new Date(node.createdAt);
        if (query.dateRange.from && nodeDate < query.dateRange.from) return false;
        if (query.dateRange.to && nodeDate > query.dateRange.to) return false;
      }
      
      return true;
    });
  }
  
  // ===== ENHANCED SEARCH AND STATISTICS =====

  /**
   * Enhanced search with Project/Tree support
   */
  async searchNodesEnhanced(options: SearchOptions): Promise<ImageNode[]> {
    const allNodes = await this.loadAllNodes();
    
    return allNodes.filter(node => {
      // Tree filter
      if (options.treeId && node.treeId !== options.treeId) {
        return false;
      }
      
      // Text search in prompts, notes, description
      if (options.text) {
        const searchText = options.text.toLowerCase();
        const searchFields = [
          this.getNodePrompt(node),
          node.userSettings.description || '',
          ...node.tags
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(searchText)) return false;
      }
      
      // Tag filters
      if (options.tags && options.tags.length > 0) {
        const hasAllTags = options.tags.every(tag => 
          node.tags.includes(tag)
        );
        if (!hasAllTags) return false;
      }
      
      // Rating filters
      if (options.rating !== undefined && (node.userSettings.rating || 0) < options.rating) {
        return false;
      }
      
      // Source filter (backward compatibility - uses model existence)
      if (options.source && ((options.source === 'generated' && !node.model) || (options.source === 'imported' && node.model))) {
        return false;
      }
      
      // Model filter
      if (options.model && node.model !== options.model) {
        return false;
      }
      
      // Favorite filter
      if (options.favorite !== undefined && node.userSettings.favorite !== options.favorite) {
        return false;
      }
      
      // Date range filter
      if (options.dateRange) {
        const nodeDate = new Date(node.createdAt);
        if (options.dateRange.start && nodeDate < options.dateRange.start) return false;
        if (options.dateRange.end && nodeDate > options.dateRange.end) return false;
      }
      
      // Tree structure filters
      if (options.hasChildren !== undefined) {
        const hasChildren = allNodes.some(n => n.parentId === node.id);
        if (hasChildren !== options.hasChildren) return false;
      }
      
      if (options.isLeaf !== undefined) {
        const isLeaf = !allNodes.some(n => n.parentId === node.id);
        if (isLeaf !== options.isLeaf) return false;
      }
      
      return true;
    });
  }



  /**
   * Calculate total storage size
   */
  private async calculateTotalSize(): Promise<number> {
    try {
      const imageFiles = await fs.readdir(this.imagesPath);
      let totalSize = 0;
      
      for (const file of imageFiles) {
        const filePath = path.join(this.imagesPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }
      
      return totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Check if project is initialized
   */
  async isInitialized(): Promise<boolean> {
    return await fs.pathExists(this.projectConfigPath);
  }
  
  /**
   * Get project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }
  
  /**
   * Get pixtree internal path
   */
  getPixtreePath(): string {
    return this.pixtreePath;
  }

  /**
   * Extract prompt from node's model configuration
   */
  private getNodePrompt(node: ImageNode): string {
    if (!node.modelConfig) return '';
    
    // Both NanoBananaGenerationConfig and SeedreamConfig use 'prompt' field
    if ('prompt' in node.modelConfig) {
      return node.modelConfig.prompt || '';
    }
    
    return '';
  }
}