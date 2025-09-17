import { StorageManager } from './storage/index.js';
import { AIProvider, AIProviderRegistry } from './ai/index.js';
import { NanoBananaProvider } from './ai/NanoBananaProvider.js';
import {
  ImageNode,
  ProjectConfig,
  TreeNode,
  GenerateOptions,
  ImportOptions,
  DiffResult,
  MergeStrategy,
  BlendPreview
} from './types/index.js';
import fs from 'fs-extra';
import path from 'path';

export class ImageVersionControl {
  private storage: StorageManager;
  private aiRegistry: AIProviderRegistry;
  
  constructor(projectPath: string) {
    this.storage = new StorageManager(projectPath);
    this.aiRegistry = new AIProviderRegistry();
    
    // Register built-in providers
    this.aiRegistry.register('nano-banana', NanoBananaProvider);
  }
  
  /**
   * Initialize a new pixtree project
   */
  async init(config: Partial<ProjectConfig>): Promise<void> {
    if (await this.storage.isInitialized()) {
      throw new Error('Project already initialized');
    }
    
    const defaultConfig: ProjectConfig = {
      name: config.name || 'Untitled Project',
      version: '1.0.0',
      aiProviders: {
        'nano-banana': {
          enabled: true,
          apiKey: config.aiProviders?.['nano-banana']?.apiKey || '',
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
        maxStorageSize: '10GB'
      },
      preferences: {
        defaultModel: 'nano-banana',
        autoExportFavorites: false,
        showThumbnails: true
      },
      ...config
    };
    
    await this.storage.createProjectStructure();
    await this.storage.saveConfig(defaultConfig);
  }
  
  /**
   * Generate a new image
   */
  async generate(prompt: string, options: GenerateOptions = { model: 'nano-banana' }): Promise<ImageNode> {
    const config = await this.storage.loadConfig();
    
    // Get or create AI provider
    const provider = this.getOrCreateProvider(options.model, config);
    
    // Get current node for parent relationship
    const currentNode = await this.storage.getCurrentNode();
    const parentId = options.parentId || currentNode?.id;
    
    // Create node ID first
    const nodeId = this.storage.generateNodeId();
    
    try {
      // Generate image
      const response = await provider.generateImage({
        prompt,
        config: options.modelConfig
      });
      
      // Save image
      const { imagePath, imageHash } = await this.storage.saveImage(response.imageData, nodeId);
      
      // Create node
      const node: ImageNode = {
        id: nodeId,
        parentId,
        imagePath,
        imageHash,
        source: 'generated',
        model: options.model,
        generationParams: {
          prompt,
          modelConfig: response.metadata.parameters
        },
        userMetadata: {
          tags: options.tags || [],
          favorite: false,
          rating: options.rating,
          notes: '',
          collections: []
        },
        success: true,
        timestamp: new Date(),
        metadata: {
          fileSize: response.imageData.length,
          dimensions: await this.getImageDimensions(response.imageData),
          format: 'png',
          generationTime: response.metadata.generationTime
        }
      };
      
      // Save node
      await this.storage.saveNode(node);
      
      // Set as current node
      await this.storage.setCurrentNode(nodeId);
      
      return node;
      
    } catch (error) {
      // Create failed node for debugging
      const failedNode: ImageNode = {
        id: nodeId,
        parentId,
        imagePath: '',
        imageHash: '',
        source: 'generated',
        model: options.model,
        generationParams: {
          prompt,
          modelConfig: options.modelConfig || {}
        },
        userMetadata: {
          tags: options.tags || [],
          favorite: false,
          rating: 1,
          notes: '',
          collections: []
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        metadata: {
          fileSize: 0,
          dimensions: { width: 0, height: 0 },
          format: 'png'
        }
      };
      
      await this.storage.saveNode(failedNode);
      throw error;
    }
  }
  
  /**
   * Import an external image
   */
  async import(imagePath: string, options: ImportOptions): Promise<ImageNode> {
    if (!(await fs.pathExists(imagePath))) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const imageData = await fs.readFile(imagePath);
    const nodeId = this.storage.generateNodeId();
    
    // Save image
    const { imagePath: savedPath, imageHash } = await this.storage.saveImage(imageData, nodeId);
    
    // Get current node for parent relationship
    const currentNode = await this.storage.getCurrentNode();
    const parentId = options.parentId || 
      (options.importMethod === 'child' ? currentNode?.id : undefined);
    
    // Create node
    const node: ImageNode = {
      id: nodeId,
      parentId,
      imagePath: savedPath,
      imageHash,
      source: 'imported',
      importInfo: {
        originalPath: imagePath,
        originalFilename: path.basename(imagePath),
        userDescription: options.description,
        importMethod: options.importMethod
      },
      userMetadata: {
        tags: options.tags || [],
        favorite: false,
        notes: '',
        collections: []
      },
      success: true,
      timestamp: new Date(),
      metadata: {
        fileSize: imageData.length,
        dimensions: await this.getImageDimensions(imageData),
        format: path.extname(imagePath).substring(1) || 'png'
      }
    };
    
    // AI analysis if requested
    if (options.analyzeWithAI) {
      try {
        const config = await this.storage.loadConfig();
        const provider = this.getOrCreateProvider('nano-banana', config);
        
        if (provider.analyzeImage) {
          const analysis = await provider.analyzeImage(imageData);
          node.aiAnalysis = analysis;
        }
      } catch (error) {
        console.warn('AI analysis failed:', error);
      }
    }
    
    await this.storage.saveNode(node);
    await this.storage.setCurrentNode(nodeId);
    
    return node;
  }
  
  /**
   * Get project tree structure
   */
  async getTree(): Promise<TreeNode[]> {
    const allNodes = await this.storage.loadAllNodes();
    return this.buildTree(allNodes);
  }
  
  /**
   * Checkout (switch to) a specific node
   */
  async checkout(nodeId: string): Promise<ImageNode> {
    const node = await this.storage.loadNode(nodeId);
    await this.storage.setCurrentNode(nodeId);
    return node;
  }
  
  /**
   * Get current working node
   */
  async getCurrentNode(): Promise<ImageNode | null> {
    return await this.storage.getCurrentNode();
  }
  
  /**
   * Compare two images/nodes
   */
  async diff(nodeId1: string, nodeId2: string): Promise<DiffResult> {
    const [node1, node2] = await Promise.all([
      this.storage.loadNode(nodeId1),
      this.storage.loadNode(nodeId2)
    ]);
    
    // Calculate similarity based on various factors
    const similarity = this.calculateSimilarity(node1, node2);
    
    return {
      node1,
      node2,
      similarity,
      differences: {
        promptDiff: this.comparePrompts(node1, node2),
        configDiff: this.compareConfigs(node1, node2)
      }
    };
  }
  
  /**
   * Preview prompt blending result
   */
  async previewBlend(nodeId1: string, nodeId2: string, strategy: MergeStrategy): Promise<BlendPreview> {
    const [node1, node2] = await Promise.all([
      this.storage.loadNode(nodeId1),
      this.storage.loadNode(nodeId2)
    ]);
    
    const prompt1 = node1.generationParams?.prompt || '';
    const prompt2 = node2.generationParams?.prompt || '';
    
    if (!prompt1 || !prompt2) {
      throw new Error('Both nodes must have generation prompts to blend');
    }
    
    const config = await this.storage.loadConfig();
    const provider = this.getOrCreateProvider(node1.model || 'nano-banana', config);
    
    if (!provider.blendPrompts) {
      // Fallback simple blending
      return {
        resultPrompt: `${prompt1} combined with ${prompt2}`,
        explanation: 'Simple concatenation of prompts',
        expectedChanges: ['Combined elements from both prompts'],
        confidence: 0.7
      };
    }
    
    const blendResult = await provider.blendPrompts({
      prompt1,
      prompt2,
      strategy: strategy.type,
      weights: strategy.weights
    });
    
    return {
      resultPrompt: blendResult.blendedPrompt,
      explanation: blendResult.explanation,
      expectedChanges: blendResult.expectedChanges,
      confidence: blendResult.confidence
    };
  }
  
  /**
   * Merge two nodes by blending their prompts
   */
  async merge(nodeId1: string, nodeId2: string, strategy: MergeStrategy): Promise<ImageNode> {
    const preview = await this.previewBlend(nodeId1, nodeId2, strategy);
    
    // Generate new image with blended prompt
    const [node1, node2] = await Promise.all([
      this.storage.loadNode(nodeId1),
      this.storage.loadNode(nodeId2)
    ]);
    
    return await this.generate(
      strategy.customPrompt || preview.resultPrompt,
      {
        model: node1.model || 'nano-banana',
        parentId: this.findCommonAncestor(nodeId1, nodeId2),
        tags: [...(node1.userMetadata.tags || []), ...(node2.userMetadata.tags || [])]
      }
    );
  }
  
  /**
   * Update node metadata (tags, rating, notes, etc.)
   */
  async updateNode(nodeId: string, updates: {
    tags?: string[];
    rating?: number;
    notes?: string;
    favorite?: boolean;
    collections?: string[];
  }): Promise<ImageNode> {
    const node = await this.storage.loadNode(nodeId);
    
    // Update user metadata
    if (updates.tags !== undefined) node.userMetadata.tags = updates.tags;
    if (updates.rating !== undefined) node.userMetadata.rating = updates.rating;
    if (updates.notes !== undefined) node.userMetadata.notes = updates.notes;
    if (updates.favorite !== undefined) node.userMetadata.favorite = updates.favorite;
    if (updates.collections !== undefined) node.userMetadata.collections = updates.collections;
    
    await this.storage.saveNode(node);
    return node;
  }
  
  /**
   * Search nodes by various criteria
   */
  async search(query: {
    tags?: string[];
    text?: string;
    rating?: number;
    minRating?: number;
    model?: string;
    dateRange?: { from?: Date; to?: Date };
  }): Promise<ImageNode[]> {
    return await this.storage.searchNodes(query);
  }
  
  /**
   * Get storage statistics
   */
  async getStats() {
    return await this.storage.getStorageStats();
  }
  
  /**
   * Export node image to specified path
   */
  async export(nodeId: string, exportPath: string, customName?: string): Promise<void> {
    const node = await this.storage.loadNode(nodeId);
    const fullImagePath = path.join(this.storage.getProjectPath(), node.imagePath);
    
    // Ensure export directory exists
    await fs.ensureDir(path.dirname(exportPath));
    
    // Copy image
    await fs.copy(fullImagePath, exportPath);
    
    // Update node's export tracking
    const exportInfo = {
      path: exportPath,
      exportedAt: new Date(),
      customName
    };
    
    if (!node.exports) {
      node.exports = [];
    }
    node.exports.push(exportInfo);
    
    await this.storage.saveNode(node);
  }
  
  /**
   * Delete a node
   */
  async deleteNode(nodeId: string): Promise<void> {
    await this.storage.deleteNode(nodeId);
  }
  
  // Private helper methods
  
  private getOrCreateProvider(modelName: string, config: ProjectConfig): AIProvider {
    let provider = this.aiRegistry.getProvider(modelName);
    
    if (!provider) {
      const providerConfig = config.aiProviders[modelName];
      if (!providerConfig || !providerConfig.enabled) {
        throw new Error(`AI provider '${modelName}' not configured or not enabled`);
      }
      
      provider = this.aiRegistry.createProvider(modelName, providerConfig);
    }
    
    return provider;
  }
  
  private buildTree(nodes: ImageNode[]): TreeNode[] {
    const nodeMap = new Map<string, ImageNode>();
    const roots: TreeNode[] = [];
    
    // Create node map
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Build tree structure
    nodes.forEach(node => {
      if (!node.parentId) {
        // Root node
        roots.push({
          node,
          children: this.getChildren(node.id, nodeMap),
          depth: 0
        });
      }
    });
    
    return roots;
  }
  
  private getChildren(nodeId: string, nodeMap: Map<string, ImageNode>, depth = 0): TreeNode[] {
    const children: TreeNode[] = [];
    
    nodeMap.forEach(node => {
      if (node.parentId === nodeId) {
        children.push({
          node,
          children: this.getChildren(node.id, nodeMap, depth + 1),
          depth: depth + 1
        });
      }
    });
    
    return children.sort((a, b) => 
      new Date(a.node.timestamp).getTime() - new Date(b.node.timestamp).getTime()
    );
  }
  
  private async getImageDimensions(imageData: Buffer): Promise<{ width: number; height: number }> {
    // This would use Sharp or similar library to get actual dimensions
    // For now, returning default values
    return { width: 1024, height: 1024 };
  }
  
  private calculateSimilarity(node1: ImageNode, node2: ImageNode): number {
    // Simple similarity calculation based on various factors
    let similarity = 0;
    
    // Prompt similarity (if both are generated)
    if (node1.generationParams?.prompt && node2.generationParams?.prompt) {
      const prompt1 = node1.generationParams.prompt.toLowerCase();
      const prompt2 = node2.generationParams.prompt.toLowerCase();
      const commonWords = prompt1.split(' ').filter(word => prompt2.includes(word));
      similarity += (commonWords.length / Math.max(prompt1.split(' ').length, prompt2.split(' ').length)) * 0.5;
    }
    
    // Tag similarity
    const tags1 = node1.userMetadata.tags;
    const tags2 = node2.userMetadata.tags;
    const commonTags = tags1.filter(tag => tags2.includes(tag));
    similarity += (commonTags.length / Math.max(tags1.length, tags2.length)) * 0.3;
    
    // Model similarity
    if (node1.model === node2.model) {
      similarity += 0.2;
    }
    
    return Math.min(similarity, 1);
  }
  
  private comparePrompts(node1: ImageNode, node2: ImageNode): string | undefined {
    const prompt1 = node1.generationParams?.prompt;
    const prompt2 = node2.generationParams?.prompt;
    
    if (!prompt1 || !prompt2) return undefined;
    
    // Simple diff - in reality, you'd want a proper diff algorithm
    if (prompt1 === prompt2) return 'Identical prompts';
    return `"${prompt1}" vs "${prompt2}"`;
  }
  
  private compareConfigs(node1: ImageNode, node2: ImageNode): Record<string, any> | undefined {
    const config1 = node1.generationParams?.modelConfig;
    const config2 = node2.generationParams?.modelConfig;
    
    if (!config1 || !config2) return undefined;
    
    const diff: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(config1), ...Object.keys(config2)]);
    
    allKeys.forEach(key => {
      if (config1[key] !== config2[key]) {
        diff[key] = { node1: config1[key], node2: config2[key] };
      }
    });
    
    return Object.keys(diff).length > 0 ? diff : undefined;
  }
  
  private findCommonAncestor(nodeId1: string, nodeId2: string): string | undefined {
    // This would implement actual common ancestor finding
    // For now, returning undefined (creates new root)
    return undefined;
  }
}