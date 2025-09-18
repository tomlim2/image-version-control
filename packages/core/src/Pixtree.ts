import { StorageManager } from './storage/index.js';
import { ProjectManager, TreeManager } from './managers/index.js';
import { AIProvider, AIProviderRegistry } from './ai/index.js';
import { NanoBananaProvider } from './ai/NanoBananaProvider.js';
import {
  ImageNode,
  ProjectConfig,
  Project,
  Tree,
  TreeNode,
  GenerateOptions,
  ImportOptions,
  ProjectCreationOptions,
  TreeCreationOptions,
  DiffResult,
  MergeStrategy,
  BlendPreview,
  WorkspaceContext,
  StatusInfo,
  ProjectStats,
  TreeStats
} from './types/index.js';
import fs from 'fs-extra';
import path from 'path';

export class Pixtree {
  private storage: StorageManager;
  private projectManager: ProjectManager;
  private treeManager: TreeManager;
  private aiRegistry: AIProviderRegistry;
  
  constructor(projectPath: string) {
    this.storage = new StorageManager(projectPath);
    this.projectManager = new ProjectManager(this.storage);
    this.treeManager = new TreeManager(this.storage);
    this.aiRegistry = new AIProviderRegistry();
    
    // Register built-in providers
    this.aiRegistry.register('nano-banana', NanoBananaProvider);
  }
  
  /**
   * Initialize a new pixtree project with enhanced Project/Tree system
   */
  async init(options: ProjectCreationOptions & { apiKey?: string }): Promise<Project> {
    if (await this.storage.isInitialized()) {
      throw new Error('Project already initialized');
    }
    
    // Create project structure first
    await this.storage.createProjectStructure();
    
    // Create the project using ProjectManager
    const project = await this.projectManager.createProject({
      name: options.name,
      description: options.description,
      defaultModel: options.defaultModel || 'nano-banana',
      initialTree: options.initialTree || {
        name: 'Main',
        type: 'creative',
        description: 'Default tree for new images'
      }
    });
    
    // Create legacy config for backward compatibility
    const defaultConfig: ProjectConfig = {
      name: project.name,
      version: '2.0.0',
      projectId: project.id,
      currentTreeId: project.settings.defaultTreeOnImport,
      aiProviders: {
        'nano-banana': {
          enabled: true,
          apiKey: options.apiKey || '',
          defaultConfig: {
            temperature: 1.0,
            model: 'gemini-2.5-flash-image-preview'
          }
        }
      },
      storage: {
      },
      preferences: {
        defaultModel: project.settings.defaultModel
      },
      projectMetadata: {
        createdAt: project.createdAt,
        totalProjects: 1
      }
    };
    
    await this.storage.saveConfig(defaultConfig);
    
    return project;
  }

  /**
   * Legacy init method for backward compatibility
   */
  async initLegacy(config: Partial<ProjectConfig>): Promise<void> {
    const projectOptions: ProjectCreationOptions = {
      name: config.name || 'Untitled Project',
      description: 'Legacy project initialization',
      defaultModel: config.preferences?.defaultModel || 'nano-banana'
    };
    
    await this.init({
      ...projectOptions,
      apiKey: config.aiProviders?.['nano-banana']?.apiKey
    });
  }
  
  /**
   * Generate a new image with Project/Tree context
   */
  async generate(prompt: string, options: GenerateOptions = { model: 'nano-banana' }): Promise<ImageNode> {
    const [config, context, project] = await Promise.all([
      this.storage.loadConfig(),
      this.storage.loadContext(),
      this.projectManager.getProject()
    ]);
    
    // Determine target tree
    let targetTreeId = options.treeId;
    if (!targetTreeId) {
      if (context.currentTree) {
        targetTreeId = context.currentTree.id;
      } else if (project.settings.defaultTreeOnImport) {
        targetTreeId = project.settings.defaultTreeOnImport;
      } else if (options.autoCreateTree) {
        // Create a new tree
        const newTree = await this.treeManager.createTree({
          name: 'Generated Images',
          type: 'creative',
          description: 'Auto-created tree for image generation',
          projectId: project.id
        });
        targetTreeId = newTree.id;
      } else {
        throw new Error('No target tree specified. Use --tree option or create a tree first.');
      }
    }
    
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
      
      // Calculate tree position
      const treePosition = await this.calculateTreePosition(targetTreeId, parentId);
      
      // Create node with enhanced metadata
      const node: ImageNode = {
        id: nodeId,
        projectId: project.id,
        treeId: targetTreeId,
        parentId,
        imagePath,
        imageHash,
        source: 'generated',
        model: options.model,
        generationParams: {
          prompt,
          modelConfig: response.metadata.parameters,
          derivedFrom: currentNode?.id
        },
        userMetadata: {
          tags: options.tags || [],
          favorite: false,
          rating: options.rating,
          notes: '',
          collections: [],
          purpose: options.purpose
        },
        success: true,
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {
          fileSize: response.imageData.length,
          dimensions: await this.getImageDimensions(response.imageData),
          format: 'png',
          generationTime: response.metadata.generationTime,
          hasAlpha: false
        },
        treePosition
      };
      
      // Save node
      await this.storage.saveNode(node);
      
      // Set as current node
      await this.storage.setCurrentNode(nodeId);
      
      // Update tree metadata
      await this.treeManager.refreshTreeMetadata(targetTreeId);
      
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
   * Import an external image with smart tree context assignment
   */
  async import(imagePath: string, options: ImportOptions): Promise<ImageNode> {
    if (!(await fs.pathExists(imagePath))) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const [imageData, project, context] = await Promise.all([
      fs.readFile(imagePath),
      this.projectManager.getProject(),
      this.storage.loadContext()
    ]);
    
    // Smart tree assignment logic
    const targetTreeId = await this.determineImportTree(imagePath, options, project, context);
    
    const nodeId = this.storage.generateNodeId();
    
    // Save image
    const { imagePath: savedPath, imageHash } = await this.storage.saveImage(imageData, nodeId);
    
    // Get current node for parent relationship
    const currentNode = await this.storage.getCurrentNode();
    const parentId = options.parentId || 
      (options.importMethod === 'child' ? currentNode?.id : undefined);
    
    // Calculate tree position
    const treePosition = await this.calculateTreePosition(targetTreeId, parentId);
    
    // AI analysis for smart tagging
    let aiAnalysis = undefined;
    let smartTags = options.tags || [];
    
    if (options.analyzeWithAI || project.settings.autoAnalysis) {
      try {
        const config = await this.storage.loadConfig();
        const provider = this.getOrCreateProvider('nano-banana', config);
        
        if (provider.analyzeImage) {
          aiAnalysis = await provider.analyzeImage(imageData);
          
          // Add smart tags based on AI analysis
          if (project.settings.autoTagging) {
            smartTags = [...smartTags, ...this.generateSmartTags(aiAnalysis, imagePath)];
          }
        }
      } catch (error) {
        console.warn('AI analysis failed:', error);
      }
    }
    
    // Create enhanced node with Project/Tree context
    const node: ImageNode = {
      id: nodeId,
      projectId: project.id,
      treeId: targetTreeId,
      parentId,
      imagePath: savedPath,
      imageHash,
      source: 'imported',
      importInfo: {
        originalPath: imagePath,
        originalFilename: path.basename(imagePath),
        userDescription: options.description,
        importMethod: options.importMethod,
        autoAssignedTree: !options.treeId // Track if tree was auto-assigned
      },
      userMetadata: {
        tags: [...new Set(smartTags)], // Remove duplicates
        favorite: false,
        notes: '',
        collections: [],
        purpose: options.purpose || this.inferPurposeFromPath(imagePath)
      },
      success: true,
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata: {
        fileSize: imageData.length,
        dimensions: await this.getImageDimensions(imageData),
        format: path.extname(imagePath).substring(1) || 'png',
        hasAlpha: await this.detectAlphaChannel(imageData)
      },
      aiAnalysis,
      treePosition
    };
    
    await this.storage.saveNode(node);
    await this.storage.setCurrentNode(nodeId);
    
    // Update tree metadata
    await this.treeManager.refreshTreeMetadata(targetTreeId);
    
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

  // ===== PROJECT/TREE MANAGEMENT METHODS =====

  /**
   * Calculate tree position for a new node
   */
  private async calculateTreePosition(treeId: string, parentId?: string): Promise<{
    depth: number;
    childIndex: number;
    hasChildren: boolean;
    isLeaf: boolean;
  }> {
    const allNodes = await this.storage.loadAllNodes();
    const treeNodes = allNodes.filter(node => node.treeId === treeId);
    
    let depth = 0;
    let childIndex = 0;
    
    if (parentId) {
      const parent = treeNodes.find(node => node.id === parentId);
      if (parent && parent.treePosition) {
        depth = parent.treePosition.depth + 1;
      }
      
      // Calculate child index among siblings
      const siblings = treeNodes.filter(node => node.parentId === parentId);
      childIndex = siblings.length; // Will be the next index
    }
    
    return {
      depth,
      childIndex,
      hasChildren: false, // Initially false, will be updated as children are added
      isLeaf: true // Initially true, will be updated when children are added
    };
  }

  /**
   * Get project (single project per workspace)
   */
  async getProject(): Promise<Project> {
    return await this.projectManager.getProject();
  }

  /**
   * Create a new tree in current project
   */
  async createTree(options: Omit<TreeCreationOptions, 'projectId'>): Promise<Tree> {
    const project = await this.projectManager.getProject();
    return await this.treeManager.createTree({
      ...options,
      projectId: project.id
    });
  }

  /**
   * Get all trees in current project
   */
  async getTrees(): Promise<Tree[]> {
    return await this.treeManager.getAllTrees();
  }

  /**
   * Get tree by ID
   */
  async getTreeById(treeId: string): Promise<Tree> {
    return await this.treeManager.getTree(treeId);
  }

  /**
   * Switch to a different tree context
   */
  async switchToTree(treeId: string): Promise<Tree> {
    const tree = await this.treeManager.getTree(treeId);
    await this.storage.setCurrentTree(tree);
    return tree;
  }

  /**
   * Get current workspace context
   */
  async getWorkspaceContext(): Promise<WorkspaceContext> {
    return await this.storage.loadContext();
  }

  /**
   * Get status information for dashboard
   */
  async getStatus(): Promise<StatusInfo> {
    const [context, project] = await Promise.all([
      this.storage.loadContext(),
      this.projectManager.getProject()
    ]);

    const projectStats = {
      totalImages: project.metadata.totalImages,
      totalTrees: project.metadata.totalTrees,
      storageUsed: project.metadata.totalSize,
      lastActivity: project.stats.lastActivity
    };

    const suggestedActions = await this.projectManager.getSuggestedActions();

    return {
      context,
      projectStats,
      suggestedActions
    };
  }

  /**
   * Get comprehensive project statistics
   */
  async getProjectStats(): Promise<ProjectStats> {
    return await this.projectManager.getProjectStatistics();
  }

  /**
   * Get tree-specific statistics
   */
  async getTreeStats(treeId: string): Promise<TreeStats> {
    return await this.treeManager.getTreeStatistics(treeId);
  }

  /**
   * Enhanced import with tree context and smart tree assignment
   */
  async importEnhanced(imagePath: string, options: ImportOptions): Promise<ImageNode> {
    const [project, context] = await Promise.all([
      this.projectManager.getProject(),
      this.storage.loadContext()
    ]);

    // Determine target tree for import
    let targetTreeId = options.treeId;
    if (!targetTreeId) {
      if (context.currentTree && context.currentTree.type === 'reference') {
        // If current tree is reference type, use it
        targetTreeId = context.currentTree.id;
      } else if (project.settings.defaultTreeOnImport) {
        // Use default tree
        targetTreeId = project.settings.defaultTreeOnImport;
      } else {
        // Create a new reference tree for imports
        const referenceTree = await this.treeManager.createTree({
          name: options.treeName || 'Imported References',
          type: options.treeType || 'reference',
          description: 'Auto-created tree for imported images',
          projectId: project.id,
          tags: options.tags || ['imported']
        });
        targetTreeId = referenceTree.id;
      }
    }

    // Update options with determined tree
    const enhancedOptions: ImportOptions = {
      ...options,
      treeId: targetTreeId
    };

    // Use the regular import method with enhanced options
    return await this.import(imagePath, enhancedOptions);
  }

  /**
   * Archive tree
   */
  async archiveTree(treeId: string): Promise<Tree> {
    return await this.treeManager.archiveTree(treeId);
  }

  /**
   * Add tags to tree
   */
  async addTreeTags(treeId: string, tags: string[]): Promise<Tree> {
    return await this.treeManager.addTagsToTree(treeId, tags);
  }

  /**
   * Toggle tree favorite status
   */
  async toggleTreeFavorite(treeId: string): Promise<Tree> {
    return await this.treeManager.toggleTreeFavorite(treeId);
  }

  /**
   * Get tree recommendations
   */
  async getTreeRecommendations(): Promise<{ tree: Tree; reason: string }[]> {
    return await this.treeManager.getTreeRecommendations();
  }

  /**
   * Validate project and tree integrity
   */
  async validateProject(): Promise<{ 
    project: { valid: boolean; issues: string[] };
    trees: { [treeId: string]: { valid: boolean; issues: string[] } };
  }> {
    const [projectValidation, trees] = await Promise.all([
      this.projectManager.validateProject(),
      this.treeManager.getAllTrees()
    ]);

    const treeValidations: { [treeId: string]: { valid: boolean; issues: string[] } } = {};
    
    for (const tree of trees) {
      treeValidations[tree.id] = await this.treeManager.validateTree(tree.id);
    }

    return {
      project: projectValidation,
      trees: treeValidations
    };
  }

  // ===== SMART IMPORT HELPER METHODS =====

  /**
   * Determine the best tree for importing an image based on context and analysis
   */
  private async determineImportTree(
    imagePath: string, 
    options: ImportOptions, 
    project: Project, 
    context: WorkspaceContext
  ): Promise<string> {
    // 1. Explicit tree specification takes priority
    if (options.treeId) {
      return options.treeId;
    }
    
    // 2. Analyze file path for clues
    const pathClues = this.analyzeImportPath(imagePath);
    
    // 3. Check if current tree context is appropriate
    if (context.currentTree) {
      const currentTree = context.currentTree;
      
      // If current tree is reference type and we're importing, it's likely a good match
      if (currentTree.type === 'reference') {
        return currentTree.id;
      }
      
      // If path suggests reference material and current tree accepts references
      if (pathClues.isReference && ['reference', 'variation'].includes(currentTree.type)) {
        return currentTree.id;
      }
      
      // If importing for editing and current tree is creative
      if (options.importMethod === 'editing-base' && currentTree.type === 'creative') {
        return currentTree.id;
      }
    }
    
    // 4. Look for existing trees that match the import purpose
    const allTrees = await this.treeManager.getAllTrees();
    
    // Try to find a reference tree for reference materials
    if (pathClues.isReference) {
      const referenceTrees = allTrees.filter(tree => 
        tree.type === 'reference' && !tree.archived
      );
      
      if (referenceTrees.length > 0) {
        // Find the most recently used reference tree
        const mostRecent = referenceTrees.sort((a, b) => 
          b.lastAccessed.getTime() - a.lastAccessed.getTime()
        )[0];
        return mostRecent.id;
      }
    }
    
    // 5. Check project default tree for imports
    if (project.settings.defaultTreeOnImport) {
      try {
        await this.treeManager.getTree(project.settings.defaultTreeOnImport);
        return project.settings.defaultTreeOnImport;
      } catch {
        // Default tree no longer exists, continue to auto-creation
      }
    }
    
    // 6. Auto-create appropriate tree based on analysis
    const treeType = this.determineTreeType(pathClues, options);
    const treeName = this.generateTreeName(pathClues, treeType);
    
    const newTree = await this.treeManager.createTree({
      name: treeName,
      type: treeType,
      description: `Auto-created tree for ${treeType} imports`,
      projectId: project.id,
      tags: pathClues.suggestedTags
    });
    
    // Update project default if this is the first tree
    if (allTrees.length === 0) {
      await this.projectManager.updateProject({
        settings: {
          ...project.settings,
          defaultTreeOnImport: newTree.id
        }
      });
    }
    
    return newTree.id;
  }

  /**
   * Analyze import file path for contextual clues
   */
  private analyzeImportPath(imagePath: string): {
    isReference: boolean;
    suggestedTags: string[];
    category: string;
    confidence: number;
  } {
    const fileName = path.basename(imagePath).toLowerCase();
    const dirName = path.dirname(imagePath).toLowerCase();
    const fullPath = imagePath.toLowerCase();
    
    const referenceKeywords = [
      'reference', 'ref', 'inspiration', 'mood', 'style', 'concept',
      'sketch', 'wireframe', 'mockup', 'example', 'sample'
    ];
    
    const creativeKeywords = [
      'final', 'output', 'result', 'generated', 'created', 'artwork',
      'piece', 'composition', 'design'
    ];
    
    let isReference = false;
    let confidence = 0;
    const suggestedTags: string[] = [];
    let category = 'general';
    
    // Check for reference indicators
    for (const keyword of referenceKeywords) {
      if (fullPath.includes(keyword)) {
        isReference = true;
        confidence += 0.3;
        suggestedTags.push(keyword);
      }
    }
    
    // Check for creative output indicators
    for (const keyword of creativeKeywords) {
      if (fullPath.includes(keyword)) {
        confidence += 0.2;
        suggestedTags.push(keyword);
      }
    }
    
    // Analyze directory structure
    if (dirName.includes('reference') || dirName.includes('inspiration')) {
      isReference = true;
      confidence += 0.4;
      suggestedTags.push('reference');
    }
    
    // File type analysis
    const ext = path.extname(imagePath).toLowerCase();
    if (['.psd', '.ai', '.sketch', '.fig'].includes(ext)) {
      suggestedTags.push('source-file');
      category = 'source';
      confidence += 0.2;
    }
    
    // Common naming patterns
    if (fileName.includes('screenshot') || fileName.includes('screen_shot')) {
      isReference = true;
      suggestedTags.push('screenshot');
      confidence += 0.3;
    }
    
    if (fileName.includes('wip') || fileName.includes('work-in-progress')) {
      suggestedTags.push('wip');
      category = 'draft';
    }
    
    return {
      isReference,
      suggestedTags: [...new Set(suggestedTags)],
      category,
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * Determine appropriate tree type based on analysis
   */
  private determineTreeType(
    pathClues: ReturnType<typeof this.analyzeImportPath>, 
    options: ImportOptions
  ): 'creative' | 'reference' | 'variation' | 'experiment' {
    // Explicit option takes priority
    if (options.treeType) {
      return options.treeType;
    }
    
    // Based on import method
    if (options.importMethod === 'editing-base') {
      return 'creative';
    }
    
    // Based on path analysis
    if (pathClues.isReference) {
      return 'reference';
    }
    
    if (pathClues.category === 'draft' || pathClues.suggestedTags.includes('wip')) {
      return 'experiment';
    }
    
    // Default based on confidence
    return pathClues.confidence > 0.5 ? 'reference' : 'creative';
  }

  /**
   * Generate appropriate tree name based on analysis
   */
  private generateTreeName(
    pathClues: ReturnType<typeof this.analyzeImportPath>, 
    treeType: 'creative' | 'reference' | 'variation' | 'experiment'
  ): string {
    const baseNames = {
      reference: ['References', 'Inspiration', 'Style Guide', 'Mood Board'],
      creative: ['Main Work', 'Creative Output', 'Final Designs', 'Artwork'],
      variation: ['Variations', 'Iterations', 'Alternatives', 'Options'],
      experiment: ['Experiments', 'Tests', 'Drafts', 'Work in Progress']
    };
    
    // Add category-specific naming
    if (pathClues.category === 'source') {
      return 'Source Files';
    }
    
    if (pathClues.suggestedTags.includes('screenshot')) {
      return 'Screenshots & References';
    }
    
    // Use base name for tree type
    const options = baseNames[treeType];
    return options[0]; // Use the first option as default
  }

  /**
   * Generate smart tags based on AI analysis and file path
   */
  private generateSmartTags(aiAnalysis: any, imagePath: string): string[] {
    const tags: string[] = [];
    
    if (aiAnalysis) {
      // Add detected objects as tags (limit to avoid clutter)
      if (aiAnalysis.detectedObjects) {
        tags.push(...aiAnalysis.detectedObjects.slice(0, 5));
      }
      
      // Add style information
      if (aiAnalysis.style) {
        tags.push(aiAnalysis.style.toLowerCase().replace(/\s+/g, '-'));
      }
      
      // Add mood if available
      if (aiAnalysis.mood) {
        tags.push(aiAnalysis.mood.toLowerCase().replace(/\s+/g, '-'));
      }
    }
    
    // Add file type tag
    const ext = path.extname(imagePath).substring(1).toLowerCase();
    if (ext) {
      tags.push(`${ext}-file`);
    }
    
    // Add import date tag
    const today = new Date().toISOString().split('T')[0];
    tags.push(`imported-${today}`);
    
    return tags.filter(tag => tag.length > 0);
  }

  /**
   * Infer purpose from file path
   */
  private inferPurposeFromPath(imagePath: string): string {
    const fileName = path.basename(imagePath, path.extname(imagePath)).toLowerCase();
    const pathLower = imagePath.toLowerCase();
    
    // Common purpose patterns
    if (pathLower.includes('reference') || pathLower.includes('inspiration')) {
      return 'Reference material for creative work';
    }
    
    if (pathLower.includes('mockup') || pathLower.includes('wireframe')) {
      return 'Design mockup or wireframe';
    }
    
    if (pathLower.includes('final') || pathLower.includes('output')) {
      return 'Final output or completed work';
    }
    
    if (fileName.includes('screenshot')) {
      return 'Screenshot for reference';
    }
    
    if (pathLower.includes('concept') || pathLower.includes('sketch')) {
      return 'Concept or sketch work';
    }
    
    return 'Imported image';
  }

  /**
   * Detect alpha channel in image data
   */
  private async detectAlphaChannel(imageData: Buffer): Promise<boolean> {
    try {
      // Simple check - in a real implementation, you'd use Sharp or similar
      // For now, just check if it's a PNG (which might have alpha)
      const header = imageData.subarray(0, 8);
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      return header.equals(pngSignature);
    } catch {
      return false;
    }
  }
}