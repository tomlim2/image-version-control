import type { ImageNode } from './ImageNode.js';

export interface Tree {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  tags: string[];
  favorite: boolean;
  archived: boolean;
  createdAt: Date;
  lastAccessed: Date;
}

export interface TreeNode {
  nodeId: string;
  children: TreeNode[];
  depth: number;
}

export interface TreeWithNodes {
  tree: Tree;
  rootNodeId?: string;
  nodeMap: Map<string, ImageNode>;
  visualTree: TreeNode[];
}

export interface PartialTreeNode {
  nodeId: string;
  hasChildren: boolean;
  childrenLoaded: boolean;
  children?: TreeNode[];
  depth: number;
}

export interface TreeCreationOptions {
  name: string;
  description?: string;
  tags?: string[];
  projectId: string;
}