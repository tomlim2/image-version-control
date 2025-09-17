import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { ImageNode, ProjectConfig } from '../types/index.js';

export class StorageManager {
  private projectPath: string;
  private pixtreePath: string;
  private imagesPath: string;
  private nodesPath: string;
  private configPath: string;
  
  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.pixtreePath = path.join(projectPath, '.pixtree');
    this.imagesPath = path.join(this.pixtreePath, 'images');
    this.nodesPath = path.join(this.pixtreePath, 'nodes');
    this.configPath = path.join(this.pixtreePath, 'config.json');
  }
  
  /**
   * Initialize project structure
   */
  async createProjectStructure(): Promise<void> {
    await fs.ensureDir(this.pixtreePath);
    await fs.ensureDir(this.imagesPath);
    await fs.ensureDir(this.nodesPath);
    
    // Create .gitignore for pixtree folder
    const gitignorePath = path.join(this.pixtreePath, '.gitignore');
    await fs.writeFile(gitignorePath, 'images/\n*.tmp\n*.cache\n');
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
    await this.updateConfig({ currentNodeId: nodeId });
  }
  
  /**
   * Get current working node
   */
  async getCurrentNode(): Promise<ImageNode | null> {
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