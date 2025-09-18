import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { 
  ImageNode, 
  ProjectConfig, 
  Project, 
  Tree, 
  WorkspaceContext,
  ProjectStats,
  TreeStats,
  SearchOptions,
  ProjectSearchOptions
} from '../types/index.js';

export class StorageManager {
  private projectPath: string;
  private pixtreePath: string;
  private imagesPath: string;
  private nodesPath: string;
  private treesPath: string;
  private configPath: string;
  private projectConfigPath: string;
  private contextPath: string;
  
  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.pixtreePath = path.join(projectPath, '.pixtree');
    this.imagesPath = path.join(this.pixtreePath, 'images');
    this.nodesPath = path.join(this.pixtreePath, 'nodes');
    this.treesPath = path.join(this.pixtreePath, 'trees');
    this.configPath = path.join(this.pixtreePath, 'config.json');
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
  
  /**
   * Save project configuration
   */
  async saveConfig(config: ProjectConfig): Promise<void> {
    await fs.writeJSON(this.configPath, config, { spaces: 2 });
  }
  
  /**
   * Load project configuration
   */
  async loadConfig(): Promise<ProjectConfig> {
    if (!(await fs.pathExists(this.configPath))) {
      throw new Error('Project not initialized. Run "pixtree init" first.');
    }
    return await fs.readJSON(this.configPath);
  }
  
  /**
   * Update specific config values
   */
  async updateConfig(updates: Partial<ProjectConfig>): Promise<void> {
    const config = await this.loadConfig();
    const updatedConfig = { ...config, ...updates };
    await this.saveConfig(updatedConfig);
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
    if (!isImageReferenced && node.source === 'generated') {
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
    
    // Also update legacy config for backward compatibility
    await this.updateConfig({ currentNodeId: nodeId });
  }
  
  /**
   * Get current working node
   */
  async getCurrentNode(): Promise<ImageNode | null> {
    const context = await this.loadContext();
    if (context.currentNode) {
      return context.currentNode;
    }
    
    // Fallback to legacy config
    const config = await this.loadConfig();
    if (!config.currentNodeId) {
      return null;
    }
    try {
      return await this.loadNode(config.currentNodeId);
    } catch {
      return null;
    }
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
      const rating = node.userMetadata.rating || 0;
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
          node.userMetadata.tags.includes(tag)
        );
        if (!hasAllTags) return false;
      }
      
      // Text search in prompt, notes, description
      if (query.text) {
        const searchText = query.text.toLowerCase();
        const searchFields = [
          node.generationParams?.prompt || '',
          node.userMetadata.notes || '',
          node.importInfo?.userDescription || '',
          ...node.userMetadata.tags
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(searchText)) return false;
      }
      
      // Rating filters
      if (query.rating !== undefined && node.userMetadata.rating !== query.rating) {
        return false;
      }
      if (query.minRating !== undefined && (node.userMetadata.rating || 0) < query.minRating) {
        return false;
      }
      
      // Model filter
      if (query.model && node.model !== query.model) {
        return false;
      }
      
      // Date range filter
      if (query.dateRange) {
        const nodeDate = new Date(node.timestamp);
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
          node.generationParams?.prompt || '',
          node.userMetadata.notes || '',
          node.importInfo?.userDescription || '',
          ...node.userMetadata.tags
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(searchText)) return false;
      }
      
      // Tag filters
      if (options.tags && options.tags.length > 0) {
        const hasAllTags = options.tags.every(tag => 
          node.userMetadata.tags.includes(tag)
        );
        if (!hasAllTags) return false;
      }
      
      // Rating filters
      if (options.rating !== undefined && (node.userMetadata.rating || 0) < options.rating) {
        return false;
      }
      
      // Source filter
      if (options.source && node.source !== options.source) {
        return false;
      }
      
      // Model filter
      if (options.model && node.model !== options.model) {
        return false;
      }
      
      // Favorite filter
      if (options.favorite !== undefined && node.userMetadata.favorite !== options.favorite) {
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
   * Get comprehensive project statistics
   */
  async getProjectStats(): Promise<ProjectStats> {
    const [nodes, trees] = await Promise.all([
      this.loadAllNodes(),
      this.loadAllTrees()
    ]);
    
    const imagesByRating: Record<string, number> = {};
    const imagesByModel: Record<string, number> = {};
    const imagesByTree: Record<string, number> = {};
    const tagUsage: Record<string, number> = {};
    const activityByDate: Record<string, number> = {};
    
    let totalGenerationTime = 0;
    let generationCount = 0;
    let favoriteCount = 0;
    let totalRating = 0;
    let ratedCount = 0;
    
    nodes.forEach(node => {
      // Rating stats
      const rating = node.userMetadata.rating || 0;
      const ratingKey = rating.toString();
      imagesByRating[ratingKey] = (imagesByRating[ratingKey] || 0) + 1;
      
      if (rating > 0) {
        totalRating += rating;
        ratedCount++;
      }
      
      // Model stats
      if (node.model) {
        imagesByModel[node.model] = (imagesByModel[node.model] || 0) + 1;
      }
      
      // Tree stats
      imagesByTree[node.treeId] = (imagesByTree[node.treeId] || 0) + 1;
      
      // Tag stats
      node.userMetadata.tags.forEach(tag => {
        tagUsage[tag] = (tagUsage[tag] || 0) + 1;
      });
      
      // Activity stats
      const dateKey = new Date(node.createdAt).toISOString().split('T')[0];
      activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1;
      
      // Generation time stats
      if (node.metadata.generationTime) {
        totalGenerationTime += node.metadata.generationTime;
        generationCount++;
      }
      
      // Favorite count
      if (node.userMetadata.favorite) {
        favoriteCount++;
      }
    });
    
    // Find most active tree
    const mostActiveTree = Object.entries(imagesByTree)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
    
    return {
      totalImages: nodes.length,
      totalNodes: nodes.length,
      totalTrees: trees.length,
      totalSize: await this.calculateTotalSize(),
      imagesByRating,
      imagesByModel,
      imagesByTree,
      tagUsage,
      activityByDate,
      averageGenerationTime: generationCount > 0 ? totalGenerationTime / generationCount : 0,
      mostActiveTree,
      favoriteCount
    };
  }

  /**
   * Get tree-specific statistics
   */
  async getTreeStats(treeId: string): Promise<TreeStats> {
    const [tree, allNodes] = await Promise.all([
      this.loadTree(treeId),
      this.loadAllNodes()
    ]);
    
    const treeNodes = allNodes.filter(node => node.treeId === treeId);
    
    if (treeNodes.length === 0) {
      return {
        totalNodes: 0,
        totalSize: 0,
        depth: 0,
        branchFactor: 0,
        generationCount: 0,
        importCount: 0,
        averageRating: 0,
        tagUsage: {},
        modelUsage: {},
        activityTimeline: []
      };
    }
    
    const tagUsage: Record<string, number> = {};
    const modelUsage: Record<string, number> = {};
    const activityByDate: Record<string, number> = {};
    
    let totalRating = 0;
    let ratedCount = 0;
    let generationCount = 0;
    let importCount = 0;
    let totalSize = 0;
    let maxDepth = 0;
    let totalChildren = 0;
    
    treeNodes.forEach(node => {
      // Basic counts
      if (node.source === 'generated') generationCount++;
      if (node.source === 'imported') importCount++;
      
      // Size calculation
      totalSize += node.metadata.fileSize;
      
      // Rating stats
      if (node.userMetadata.rating) {
        totalRating += node.userMetadata.rating;
        ratedCount++;
      }
      
      // Tag usage
      node.userMetadata.tags.forEach(tag => {
        tagUsage[tag] = (tagUsage[tag] || 0) + 1;
      });
      
      // Model usage
      if (node.model) {
        modelUsage[node.model] = (modelUsage[node.model] || 0) + 1;
      }
      
      // Activity timeline
      const dateKey = new Date(node.createdAt).toISOString().split('T')[0];
      activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1;
      
      // Depth calculation
      if (node.treePosition) {
        maxDepth = Math.max(maxDepth, node.treePosition.depth);
      }
      
      // Children count for branch factor
      const childrenCount = treeNodes.filter(n => n.parentId === node.id).length;
      if (childrenCount > 0) {
        totalChildren += childrenCount;
      }
    });
    
    const nodesWithChildren = treeNodes.filter(node => 
      treeNodes.some(n => n.parentId === node.id)
    ).length;
    
    const activityTimeline = Object.entries(activityByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      totalNodes: treeNodes.length,
      totalSize,
      depth: maxDepth,
      branchFactor: nodesWithChildren > 0 ? totalChildren / nodesWithChildren : 0,
      generationCount,
      importCount,
      averageRating: ratedCount > 0 ? totalRating / ratedCount : 0,
      tagUsage,
      modelUsage,
      activityTimeline
    };
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
    return await fs.pathExists(this.configPath);
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
}