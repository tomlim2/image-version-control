/**
 * Import operation types for Pixtree
 */

export interface ImportOptions {
  treeId?: string; // target tree, creates new one if not specified
  parentId?: string;
  description?: string;
  importMethod: 'root' | 'child' | 'editing-base';
  analyzeWithAI?: boolean;
  tags?: string[];
  treeTags?: string[]; // tags for new tree if auto-creating
  treeName?: string; // name for new tree if auto-creating
  treeDescription?: string; // description for new tree if auto-creating
  purpose?: string;
  rating?: number; // initial rating for the imported image
}