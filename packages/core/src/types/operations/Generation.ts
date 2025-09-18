/**
 * Generation operation types for Pixtree
 */

export interface GenerateOptions {
  model: string;
  treeId?: string; // target tree, uses current context if not specified
  parentId?: string;
  modelConfig?: Record<string, any>;
  tags?: string[];
  rating?: number;
  purpose?: string;
  autoCreateTree?: boolean; // create new tree if none specified
}