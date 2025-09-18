/**
 * Tree-related types for Pixtree
 */

import type { ImageNode } from './ImageNode.js';

export interface Tree {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastAccessed: Date;
  
  // Tree purpose (user-defined)
  purpose?: string;
  
  // Tree metadata
  metadata: {
    totalNodes: number;
    depth: number; // max depth of tree
    totalSize: number; // bytes
    branchCount: number; // number of direct children from root
    leafCount: number; // number of nodes with no children
  };
  
  // Root node reference
  rootNodeId?: string; // first node in this tree
  
  // Tree-level tags and organization
  tags: string[];
  favorite: boolean;
  archived: boolean;
  
  // Access tracking
  stats: {
    totalGenerations: number;
    totalImports: number;
    lastActivity: Date;
    avgRating: number;
    mostUsedPrompts: string[];
  };
}

export interface TreeNode {
  node: ImageNode;
  children: TreeNode[];
  depth: number;
}

export interface TreeWithNodes {
  tree: Tree;
  rootNode?: ImageNode;
  totalNodes: number;
  visualTree: TreeNode[];
}

export interface TreeStats {
  totalNodes: number;
  totalSize: number;
  depth: number;
  branchFactor: number; // average children per node
  generationCount: number;
  importCount: number;
  averageRating: number;
  tagUsage: Record<string, number>;
  modelUsage: Record<string, number>;
  activityTimeline: { date: string; count: number }[];
}

export interface TreeCreationOptions {
  name: string;
  description?: string;
  purpose?: string;
  tags?: string[];
  projectId: string;
}