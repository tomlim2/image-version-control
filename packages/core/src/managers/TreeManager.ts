import { 
  Tree, 
  TreeCreationOptions, 
  TreeStats,
  ImageNode,
  TreeWithNodes,
  TreeNode 
} from '../types/index.js';
import { StorageManager } from '../storage/StorageManager.js';

/**
 * Manages tree-level operations and metadata
 */
export class TreeManager {
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  /**
   * Create a new tree in the current project
   */
  async createTree(options: TreeCreationOptions): Promise<Tree> {
    const treeId = this.storage.generateTreeId();
    const now = new Date();

    const tree: Tree = {
      id: treeId,
      projectId: options.projectId,
      name: options.name,
      description: options.description,
      createdAt: now,
      lastAccessed: now,
      purpose: options.purpose,
      metadata: {
        totalNodes: 0,
        depth: 0,
        totalSize: 0,
        branchCount: 0,
        leafCount: 0
      },
      tags: options.tags || [],
      favorite: false,
      archived: false,
      stats: {
        totalGenerations: 0,
        totalImports: 0,
        lastActivity: now,
        avgRating: 0,
        mostUsedPrompts: []
      }
    };

    await this.storage.saveTree(tree);

    // Set as current tree
    await this.storage.setCurrentTree(tree);

    return tree;
  }

  /**
   * Get tree by ID and update access time
   */
  async getTree(treeId: string): Promise<Tree> {
    const tree = await this.storage.loadTree(treeId);
    
    // Update last accessed time
    await this.storage.updateTree(treeId, {
      lastAccessed: new Date()
    });

    return tree;
  }

  /**
   * Get all trees in current project
   */
  async getAllTrees(): Promise<Tree[]> {
    return await this.storage.loadAllTrees();
  }

  /**
   * Update tree metadata and settings
   */
  async updateTree(treeId: string, updates: Partial<Tree>): Promise<Tree> {
    return await this.storage.updateTree(treeId, updates);
  }

  /**
   * Delete tree and optionally its nodes
   */
  async deleteTree(treeId: string, deleteNodes: boolean = false): Promise<void> {
    await this.storage.deleteTree(treeId, deleteNodes);
  }

  /**
   * Get tree with its complete node structure
   */
  async getTreeWithNodes(treeId: string): Promise<TreeWithNodes> {
    const [tree, allNodes] = await Promise.all([
      this.storage.loadTree(treeId),
      this.storage.loadAllNodes()
    ]);

    const treeNodes = allNodes.filter(node => node.treeId === treeId);
    const visualTree = this.buildVisualTree(treeNodes);
    const rootNode = treeNodes.find(node => !node.parentId);

    return {
      tree,
      rootNode,
      totalNodes: treeNodes.length,
      visualTree
    };
  }

  /**
   * Get tree statistics
   */
  async getTreeStatistics(treeId: string): Promise<TreeStats> {
    return await this.storage.getTreeStats(treeId);
  }

  /**
   * Refresh tree metadata based on current nodes
   */
  async refreshTreeMetadata(treeId: string): Promise<Tree> {
    const [tree, allNodes] = await Promise.all([
      this.storage.loadTree(treeId),
      this.storage.loadAllNodes()
    ]);

    const treeNodes = allNodes.filter(node => node.treeId === treeId);
    
    if (treeNodes.length === 0) {
      return tree;
    }

    // Calculate tree structure metrics dynamically
    const calculateDepth = (nodeId: string, visited = new Set()): number => {
      if (visited.has(nodeId)) return 0; // Avoid infinite loops
      visited.add(nodeId);
      
      const node = treeNodes.find(n => n.id === nodeId);
      if (!node || !node.parentId) return 0;
      
      return 1 + calculateDepth(node.parentId, visited);
    };
    
    const depths = treeNodes.map(node => calculateDepth(node.id));
    const maxDepth = Math.max(...depths, 0);
    
    const rootNodes = treeNodes.filter(node => !node.parentId);
    const leafNodes = treeNodes.filter(node => 
      !treeNodes.some(child => child.parentId === node.id)
    );

    const totalSize = treeNodes.reduce((sum, node) => sum + node.fileInfo.fileSize, 0);
    
    // Calculate average rating
    const ratedNodes = treeNodes.filter(node => node.userSettings.rating);
    const avgRating = ratedNodes.length > 0 
      ? ratedNodes.reduce((sum, node) => sum + (node.userSettings.rating || 0), 0) / ratedNodes.length
      : 0;

    // Get most used prompts
    const prompts = treeNodes
      .filter(node => this.getNodePrompt(node))
      .map(node => this.getNodePrompt(node));
    
    const promptCounts: Record<string, number> = {};
    prompts.forEach(prompt => {
      promptCounts[prompt] = (promptCounts[prompt] || 0) + 1;
    });
    
    const mostUsedPrompts = Object.entries(promptCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([prompt]) => prompt);

    // Count generations vs imports
    const generationCount = treeNodes.filter(node => node.source === 'generated').length;
    const importCount = treeNodes.filter(node => node.source === 'imported').length;

    const updates: Partial<Tree> = {
      metadata: {
        totalNodes: treeNodes.length,
        depth: maxDepth,
        totalSize,
        branchCount: rootNodes.length,
        leafCount: leafNodes.length
      },
      stats: {
        totalGenerations: generationCount,
        totalImports: importCount,
        lastActivity: new Date(),
        avgRating,
        mostUsedPrompts
      }
    };

    return await this.storage.updateTree(treeId, updates);
  }

  /**
   * Archive tree (mark as archived, don't delete)
   */
  async archiveTree(treeId: string): Promise<Tree> {
    return await this.storage.updateTree(treeId, {
      archived: true
    });
  }

  /**
   * Unarchive tree
   */
  async unarchiveTree(treeId: string): Promise<Tree> {
    return await this.storage.updateTree(treeId, {
      archived: false
    });
  }

  /**
   * Add tags to tree
   */
  async addTagsToTree(treeId: string, tags: string[]): Promise<Tree> {
    const tree = await this.storage.loadTree(treeId);
    const existingTags = tree.tags || [];
    const newTags = tags.filter(tag => !existingTags.includes(tag));
    
    return await this.storage.updateTree(treeId, {
      tags: [...existingTags, ...newTags]
    });
  }

  /**
   * Remove tags from tree
   */
  async removeTagsFromTree(treeId: string, tags: string[]): Promise<Tree> {
    const tree = await this.storage.loadTree(treeId);
    const updatedTags = tree.tags.filter(tag => !tags.includes(tag));
    
    return await this.storage.updateTree(treeId, {
      tags: updatedTags
    });
  }

  /**
   * Set tree as favorite
   */
  async toggleTreeFavorite(treeId: string): Promise<Tree> {
    const tree = await this.storage.loadTree(treeId);
    
    return await this.storage.updateTree(treeId, {
      favorite: !tree.favorite
    });
  }


  /**
   * Get archived trees
   */
  async getArchivedTrees(): Promise<Tree[]> {
    const allTrees = await this.storage.loadAllTrees();
    return allTrees.filter(tree => tree.archived);
  }

  /**
   * Get favorite trees
   */
  async getFavoriteTrees(): Promise<Tree[]> {
    const allTrees = await this.storage.loadAllTrees();
    return allTrees.filter(tree => tree.favorite);
  }

  /**
   * Search trees by tags
   */
  async searchTreesByTags(tags: string[]): Promise<Tree[]> {
    const allTrees = await this.storage.loadAllTrees();
    
    return allTrees.filter(tree => 
      tags.every(tag => tree.tags.includes(tag))
    );
  }

  /**
   * Get tree recommendations based on current context
   */
  async getTreeRecommendations(): Promise<{ tree: Tree; reason: string }[]> {
    const recommendations: { tree: Tree; reason: string }[] = [];
    
    try {
      const [allTrees, context] = await Promise.all([
        this.storage.loadAllTrees(),
        this.storage.loadContext()
      ]);

      // Recommend recently accessed trees
      if (context.recentTrees && context.recentTrees.length > 0) {
        const recentTree = context.recentTrees[0];
        if (recentTree.id !== context.currentTree?.id) {
          recommendations.push({
            tree: recentTree,
            reason: 'Recently accessed'
          });
        }
      }

      // Recommend trees with similar tags to current
      if (context.currentTree) {
        const currentTags = context.currentTree.tags;
        if (currentTags.length > 0) {
          const similarTrees = allTrees.filter(tree => 
            tree.tags.some(tag => currentTags.includes(tag)) &&
            tree.id !== context.currentTree!.id &&
            !tree.archived
          ).slice(0, 2);
          
          similarTrees.forEach(tree => {
            const sharedTags = tree.tags.filter(tag => currentTags.includes(tag));
            recommendations.push({
              tree,
              reason: `Similar tags (${sharedTags.join(', ')})`
            });
          });
        }
      }

      // Recommend favorite trees
      const favoriteTrees = allTrees.filter(tree => 
        tree.favorite && 
        tree.id !== context.currentTree?.id &&
        !tree.archived
      ).slice(0, 2);
      
      favoriteTrees.forEach(tree => {
        if (!recommendations.some(r => r.tree.id === tree.id)) {
          recommendations.push({
            tree,
            reason: 'Favorite tree'
          });
        }
      });

    } catch (error) {
      // Return empty recommendations if there's an error
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  /**
   * Build visual tree structure from nodes
   */
  private buildVisualTree(nodes: ImageNode[]): TreeNode[] {
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

  /**
   * Get children nodes recursively
   */
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
      new Date(a.node.createdAt).getTime() - new Date(b.node.createdAt).getTime()
    );
  }

  /**
   * Validate tree structure and integrity
   */
  async validateTree(treeId: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const [tree, allNodes] = await Promise.all([
        this.storage.loadTree(treeId),
        this.storage.loadAllNodes()
      ]);

      const treeNodes = allNodes.filter(node => node.treeId === treeId);

      // Check for orphaned nodes (parent doesn't exist)
      treeNodes.forEach(node => {
        if (node.parentId && !treeNodes.some(n => n.id === node.parentId)) {
          issues.push(`Node ${node.id} has invalid parent ${node.parentId}`);
        }
      });

      // Check for circular references
      treeNodes.forEach(node => {
        if (this.hasCircularReference(node, treeNodes)) {
          issues.push(`Node ${node.id} has circular reference`);
        }
      });

      // Check tree metadata consistency
      const actualNodeCount = treeNodes.length;
      if (tree.metadata.totalNodes !== actualNodeCount) {
        issues.push(`Tree metadata shows ${tree.metadata.totalNodes} nodes but found ${actualNodeCount}`);
      }

    } catch (error) {
      issues.push(`Tree validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Check for circular references in tree structure
   */
  private hasCircularReference(node: ImageNode, allNodes: ImageNode[], visited = new Set<string>()): boolean {
    if (visited.has(node.id)) {
      return true;
    }

    visited.add(node.id);

    if (node.parentId) {
      const parent = allNodes.find(n => n.id === node.parentId);
      if (parent && this.hasCircularReference(parent, allNodes, new Set(visited))) {
        return true;
      }
    }

    return false;
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