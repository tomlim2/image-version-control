/**
 * Workspace context and status types for Pixtree
 */

import type { Tree } from '../core/Tree.js';
import type { ImageNode } from '../core/ImageNode.js';
import type { Project } from '../core/Project.js';
import type { TreeWithNodes } from '../core/Tree.js';

export interface WorkspaceContext {
  currentTree?: Tree;
  currentNode?: ImageNode;
  recentTrees: Tree[];
}

export interface StatusInfo {
  context: WorkspaceContext;
  projectStats: {
    totalImages: number;
    totalTrees: number;
    storageUsed: number;
    lastActivity: Date;
  };
  suggestedActions: string[];
}

export interface ProjectTreeStructure {
  project: Project;
  trees: TreeWithNodes[];
}