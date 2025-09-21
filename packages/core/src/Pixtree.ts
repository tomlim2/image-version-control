import { StorageManager } from './storage/index.js';
import { ProjectManager, TreeManager } from './managers/index.js';
import { ExportService } from './services/index.js';
import { AIProvider, AIProviderRegistry } from './types/ai/AIProvider.js';
import { NanoBananaProvider } from './ai/NanoBananaProvider.js';
import {
  ImageNode,
  NanoBananaGenerationConfig,
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
  StatusInfo
} from './types/index.js';
import fs from 'fs-extra';
import path from 'path';

export class Pixtree {
  private storage: StorageManager;
  private projectManager: ProjectManager;
  private treeManager: TreeManager;
  private exportService: ExportService;
  private aiRegistry: AIProviderRegistry;
  
  constructor(projectPath: string) {
    this.storage = new StorageManager(projectPath);
    this.projectManager = new ProjectManager(this.storage);
    this.treeManager = new TreeManager(this.storage);
    this.exportService = new ExportService(projectPath);
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
    
    // Create the project using ProjectManager (without initial tree)
    const project = await this.projectManager.createProject({
      name: options.name,
      description: options.description
      // No initial tree - users will create trees explicitly
    });
    
    return project;
  }

  /**
   * Create a new tree
   */
  async createTree(options: Omit<TreeCreationOptions, 'projectId'>): Promise<Tree> {
    const project = await this.projectManager.getProject();
    
    return await this.treeManager.createTree({
      ...options,
      projectId: project.id
    });
  }

  /**
   * Switch to a tree (by name or ID)
   */
  async switchToTree(nameOrId: string): Promise<Tree> {
    const trees = await this.getTrees();
    
    // Try to find by name first, then by ID
    let tree = trees.find(t => t.name === nameOrId);
    if (!tree) {
      tree = trees.find(t => t.id === nameOrId);
    }
    
    if (!tree) {
      throw new Error(`Tree not found: ${nameOrId}`);
    }
    
    // Update workspace context
    const context = await this.storage.loadContext();
    context.currentTree = tree;
    context.currentNode = undefined; // Clear current node when switching trees
    await this.storage.saveContext(context);
    
    return tree;
  }

  /**
   * Delete a tree
   */
  async deleteTree(nameOrId: string): Promise<void> {
    const trees = await this.getTrees();
    
    // Try to find by name first, then by ID
    let tree = trees.find(t => t.name === nameOrId);
    if (!tree) {
      tree = trees.find(t => t.id === nameOrId);
    }
    
    if (!tree) {
      throw new Error(`Tree not found: ${nameOrId}`);
    }
    
    // Clear current tree if it's being deleted
    const context = await this.storage.loadContext();
    if (context.currentTree && context.currentTree.id === tree.id) {
      context.currentTree = undefined;
      context.currentNode = undefined;
      await this.storage.saveContext(context);
    }
    
    await this.treeManager.deleteTree(tree.id);
  }
  
  /**
   * Generate a new image with Project/Tree context
   */
  async generate(prompt: string, options: GenerateOptions = { model: 'nano-banana' }): Promise<ImageNode> {
    const [context, project] = await Promise.all([
      this.storage.loadContext(),
      this.projectManager.getProject()
    ]);
    
    // Require current tree context
    if (!context.currentTree) {
      throw new Error('No tree selected. Use "pixtree tree create <name>" and "pixtree tree switch <name>" first.');
    }
    
    const targetTreeId = context.currentTree.id;
    
    // Get or create AI provider
    const provider = await this.getOrCreateProvider(options.model);
    
    // Get current node for parent relationship
    const currentNode = await this.storage.getCurrentNode();
    const parentId = options.parentId || currentNode?.id;
    
    // Auto-include current image as reference if current node exists
    let enhancedModelConfig = { ...options.modelConfig };
    if (currentNode) {
      // Get current image path
      const currentImagePath = path.join(this.storage.getProjectPath(), currentNode.imagePath);
      
      // Add current image to reference images (if not already specified)
      const existingRefs = enhancedModelConfig.referenceImages || options.referenceImages || [];
      if (!existingRefs.includes(currentImagePath)) {
        enhancedModelConfig.referenceImages = [currentImagePath, ...existingRefs];
      }
    }
    
    // Create node ID first
    const nodeId = this.storage.generateNodeId();
    
    try {
      // Generate image with current image context
      const response = await provider.generateImage({
        prompt,
        config: enhancedModelConfig
      });
      
      // Save image
      const { imagePath, imageHash } = await this.storage.saveImage(response.imageData, nodeId);
      
      // Create node with enhanced metadata
      const node: ImageNode = {
        id: nodeId,
        projectId: project.id,
        treeId: targetTreeId,
        parentId,
        imagePath,
        imageHash,
        model: options.model,
        modelConfig: {
          prompt,
          temperature: options.temperature ?? 0.7,      // Use provided or default
          topP: options.topP ?? 0.95,                   // Use provided or default
          topK: options.topK,                           // Optional parameter
          candidateCount: options.candidateCount ?? 1,  // Use provided or default
          seed: options.seed,                           // Optional for reproducibility
          aspectRatio: options.aspectRatio ?? "1:1",    // Use provided or default
          batchCount: options.batchCount ?? 1,          // Use provided or default
          referenceImages: enhancedModelConfig.referenceImages  // Includes current image + user references
        } as NanoBananaGenerationConfig,
        tags: options.tags || [],
        userSettings: {
          favorite: false,
          rating: options.rating
        },
        createdAt: new Date(),
        lastAccessed: new Date(),
        fileInfo: {
          fileSize: response.imageData.length,
          dimensions: await this.getImageDimensions(response.imageData),
          format: 'png',
          generationTime: response.metadata.generationTime,
          hasAlpha: false
        }
      };
      
      // Save node
      await this.storage.saveNode(node);
      
      // Set as current node
      await this.storage.setCurrentNode(nodeId);
      
      // Update tree metadata
      await this.treeManager.refreshTreeAccess(targetTreeId);
      
      return node;
      
    } catch (error) {
      // Simply throw the error without creating a failed node
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
    
    // Require current tree context
    if (!context.currentTree) {
      throw new Error('No tree selected. Use "pixtree tree create <name>" and "pixtree tree switch <name>" first.');
    }
    
    const targetTreeId = context.currentTree.id;
    
    // Check if tree already has nodes (prevent mixing imports with existing content)
    const allNodes = await this.storage.loadAllNodes();
    const existingNodes = allNodes.filter(node => node.treeId === targetTreeId);
    if (existingNodes.length > 0) {
      throw new Error(`Tree "${context.currentTree.name}" already contains ${existingNodes.length} image(s). Create a new tree for imports to keep content organized.`);
    }
    
    const nodeId = this.storage.generateNodeId();
    
    // Save image
    const { imagePath: savedPath, imageHash } = await this.storage.saveImage(imageData, nodeId);
    
    // Get current node for parent relationship
    const currentNode = await this.storage.getCurrentNode();
    const parentId = options.parentId || 
      (options.importMethod === 'child' ? currentNode?.id : undefined);
    
    // Generate smart tags from file path and user tags
    let smartTags = options.tags || [];
    
    // Create enhanced node with Project/Tree context
    const node: ImageNode = {
      id: nodeId,
      projectId: project.id,
      treeId: targetTreeId,
      parentId,
      imagePath: savedPath,
      imageHash,
      model: undefined, // imported images have no model
      modelConfig: undefined, // imported images have no model config
      importInfo: {
        originalPath: imagePath,
        originalFilename: path.basename(imagePath)
      },
      tags: [...new Set(smartTags)], // Remove duplicates
      userSettings: {
        favorite: false,
        description: options.purpose || this.inferPurposeFromPath(imagePath)
      },
      createdAt: new Date(),
      lastAccessed: new Date(),
      fileInfo: {
        fileSize: imageData.length,
        dimensions: await this.getImageDimensions(imageData),
        format: path.extname(imagePath).substring(1) || 'png',
        hasAlpha: await this.detectAlphaChannel(imageData)
      }
    };
    
    await this.storage.saveNode(node);
    await this.storage.setCurrentNode(nodeId);
    
    // Update tree metadata
    await this.treeManager.refreshTreeAccess(targetTreeId);
    
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
    
    const prompt1 = this.getNodePrompt(node1);
    const prompt2 = this.getNodePrompt(node2);
    
    if (!prompt1 || !prompt2) {
      throw new Error('Both nodes must have generation prompts to blend');
    }
    
    const provider = await this.getOrCreateProvider(node1.model || 'nano-banana');
    
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
      weights: strategy.weights ? { prompt1: strategy.weights.node1 || 0.5, prompt2: strategy.weights.node2 || 0.5 } : undefined
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
        tags: [...(node1.tags || []), ...(node2.tags || [])]
      }
    );
  }
  
  /**
   * Update node metadata (tags, rating, notes, etc.)
   */
  async updateNode(nodeId: string, updates: {
    tags?: string[];
    rating?: number;
    description?: string;
    favorite?: boolean;
  }): Promise<ImageNode> {
    const node = await this.storage.loadNode(nodeId);
    
    // Update user metadata
    if (updates.tags !== undefined) node.tags = updates.tags;
    if (updates.rating !== undefined) node.userSettings.rating = updates.rating;
    if (updates.description !== undefined) node.userSettings.description = updates.description;
    if (updates.favorite !== undefined) node.userSettings.favorite = updates.favorite;
    
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
    
    // Record export in ExportService
    const format = path.extname(exportPath).slice(1) || 'png';
    await this.exportService.recordExport(nodeId, exportPath, {
      customName,
      format
    });
    
    // Update node's simple export tracking
    const exportStats = await this.exportService.getExportStats(nodeId);
    node.exportCount = exportStats.count;
    node.lastExportedAt = exportStats.lastExportedAt;
    
    await this.storage.saveNode(node);
  }
  
  /**
   * Delete a node
   */
  async deleteNode(nodeId: string): Promise<void> {
    await this.storage.deleteNode(nodeId);
  }
  
  // Private helper methods
  
  private async getOrCreateProvider(modelName: string): Promise<AIProvider> {
    let provider = this.aiRegistry.getProvider(modelName);
    
    if (!provider) {
      // Load configuration from storage
      const config = await this.storage.loadConfig();
      const providerConfig = config.aiProviders[modelName];
      
      if (!providerConfig) {
        throw new Error(`AI provider '${modelName}' is not configured`);
      }
      
      if (!providerConfig.enabled) {
        throw new Error(`AI provider '${modelName}' is disabled`);
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
          nodeId: node.id,
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
          nodeId: node.id,
          children: this.getChildren(node.id, nodeMap, depth + 1),
          depth: depth + 1
        });
      }
    });
    
    return children.sort((a, b) => {
      const nodeA = nodeMap.get(a.nodeId);
      const nodeB = nodeMap.get(b.nodeId);
      if (!nodeA || !nodeB) return 0;
      return new Date(nodeA.createdAt).getTime() - new Date(nodeB.createdAt).getTime();
    });
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
    const prompt1 = this.getNodePrompt(node1);
    const prompt2 = this.getNodePrompt(node2);
    if (prompt1 && prompt2) {
      const prompt1Lower = prompt1.toLowerCase();
      const prompt2Lower = prompt2.toLowerCase();
      const commonWords = prompt1Lower.split(' ').filter(word => prompt2Lower.includes(word));
      similarity += (commonWords.length / Math.max(prompt1Lower.split(' ').length, prompt2Lower.split(' ').length)) * 0.5;
    }
    
    // Tag similarity
    const tags1 = node1.tags;
    const tags2 = node2.tags;
    const commonTags = tags1.filter(tag => tags2.includes(tag));
    similarity += (commonTags.length / Math.max(tags1.length, tags2.length)) * 0.3;
    
    // Model similarity
    if (node1.model === node2.model) {
      similarity += 0.2;
    }
    
    return Math.min(similarity, 1);
  }
  
  private comparePrompts(node1: ImageNode, node2: ImageNode): string | undefined {
    const prompt1 = this.getNodePrompt(node1);
    const prompt2 = this.getNodePrompt(node2);
    
    if (!prompt1 || !prompt2) return undefined;
    
    // Simple diff - in reality, you'd want a proper diff algorithm
    if (prompt1 === prompt2) return 'Identical prompts';
    return `"${prompt1}" vs "${prompt2}"`;
  }
  
  private compareConfigs(node1: ImageNode, node2: ImageNode): Record<string, any> | undefined {
    const config1 = node1.modelConfig;
    const config2 = node2.modelConfig;
    
    if (!config1 || !config2) return undefined;
    
    const diff: Record<string, any> = {};
    
    // Type-safe comparison for specific config types
    if ('prompt' in config1 && 'prompt' in config2) {
      // Compare prompt (common to both NanoBananaGenerationConfig and SeedreamConfig)
      if (config1.prompt !== config2.prompt) {
        diff.prompt = { config1: config1.prompt, config2: config2.prompt };
      }
      
      // Check if both are SeedreamConfig by checking for aspectRatio
      if ('aspectRatio' in config1 && 'aspectRatio' in config2) {
        if (config1.aspectRatio !== config2.aspectRatio) {
          diff.aspectRatio = { config1: config1.aspectRatio, config2: config2.aspectRatio };
        }
      }
      
      // Check if both are NanoBananaGenerationConfig by checking for mimeType
      if ('mimeType' in config1 && 'mimeType' in config2) {
        if (config1.mimeType !== config2.mimeType) {
          diff.mimeType = { config1: config1.mimeType, config2: config2.mimeType };
        }
      }
    }
    
    return Object.keys(diff).length > 0 ? diff : undefined;
  }
  
  private findCommonAncestor(nodeId1: string, nodeId2: string): string | undefined {
    // This would implement actual common ancestor finding
    // For now, returning undefined (creates new root)
    return undefined;
  }

  // ===== PROJECT/TREE MANAGEMENT METHODS =====


  /**
   * Get project (single project per workspace)
   */
  async getProject(): Promise<Project> {
    return await this.projectManager.getProject();
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

    // Calculate project stats dynamically
    const [allNodes, allTrees] = await Promise.all([
      this.storage.loadAllNodes(),
      this.storage.loadAllTrees()
    ]);

    const projectStats = {
      totalImages: allNodes.length,
      totalTrees: allTrees.length,
      storageUsed: allNodes.reduce((sum, node) => sum + node.fileInfo.fileSize, 0),
      lastActivity: new Date()
    };

    const suggestedActions = await this.projectManager.getSuggestedActions();

    return {
      context,
      projectStats,
      suggestedActions
    };
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
      if (context.currentTree && context.currentTree.tags.includes('reference')) {
        // If current tree is reference type, use it
        targetTreeId = context.currentTree.id;
      } else {
        // Use first available tree or create new tree for imports
        const trees = await this.getTrees();
        if (trees.length > 0) {
          targetTreeId = trees[0].id;
        } else {
          // Create a new reference tree for imports
          const referenceTree = await this.treeManager.createTree({
            name: options.treeName || 'Imported References',
            description: 'Auto-created tree for imported images',
            projectId: project.id,
            tags: options.tags || ['imported', 'reference']
          });
          targetTreeId = referenceTree.id;
        }
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
      
      // If current tree has reference tags and we're importing, it's likely a good match
      if (currentTree.tags.includes('reference')) {
        return currentTree.id;
      }
      
      // If path suggests reference material and current tree accepts references
      if (pathClues.isReference && (currentTree.tags.includes('reference') || currentTree.tags.includes('variation'))) {
        return currentTree.id;
      }
      
      // If importing for editing and current tree is creative
      if (options.importMethod === 'editing-base' && currentTree.tags.includes('creative')) {
        return currentTree.id;
      }
    }
    
    // 4. Look for existing trees that match the import purpose
    const availableTrees = await this.treeManager.getAllTrees();
    
    // Try to find a reference tree for reference materials
    if (pathClues.isReference) {
      const referenceTrees = availableTrees.filter(tree => 
        tree.tags.includes('reference') && !tree.archived
      );
      
      if (referenceTrees.length > 0) {
        // Find the most recently used reference tree
        const mostRecent = referenceTrees.sort((a, b) => 
          b.lastAccessed.getTime() - a.lastAccessed.getTime()
        )[0];
        return mostRecent.id;
      }
    }
    
    // 5. Use first available tree as fallback
    if (availableTrees.length > 0) {
      return availableTrees[0].id;
    }
    
    // 6. Auto-create appropriate tree based on analysis
    const treeName = this.generateTreeName(pathClues);
    
    const newTree = await this.treeManager.createTree({
      name: treeName,
      description: `Auto-created tree for imports`,
      projectId: project.id,
      tags: pathClues.suggestedTags
    });
    
    // Update project default if this is the first tree
    // Tree created successfully - no need to update project settings in simplified structure
    
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

  /**
   * Generate appropriate tree name based on analysis
   */
  private generateTreeName(
    pathClues: ReturnType<typeof this.analyzeImportPath>
  ): string {
    // Add category-specific naming
    if (pathClues.category === 'source') {
      return 'Source Files';
    }
    
    if (pathClues.suggestedTags.includes('screenshot')) {
      return 'Screenshots & References';
    }
    
    // Default tree name based on tags
    if (pathClues.suggestedTags.includes('reference')) {
      return 'References';
    }
    if (pathClues.suggestedTags.includes('creative')) {
      return 'Creative Work';
    }
    if (pathClues.suggestedTags.includes('experiment')) {
      return 'Experiments';
    }
    
    return 'Imported Images';
  }

  /**
   * Generate smart tags based on file path
   */
  private generateSmartTags(imagePath: string): string[] {
    const tags: string[] = [];
    
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

  /**
   * Get the ExportService instance
   */
  getExportService(): ExportService {
    return this.exportService;
  }
}