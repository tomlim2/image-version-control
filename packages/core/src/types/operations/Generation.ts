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
  
  // Nano Banana specific options
  temperature?: number;        // 0.0-1.0, controls creativity (default: 0.7)
  topP?: number;              // Token selection threshold (default: 0.95)
  topK?: number;              // Number of top tokens to consider
  candidateCount?: number;    // Number of candidates (default: 1)
  seed?: number;              // Seed for reproducible results
  aspectRatio?: string;       // Image aspect ratio (default: "1:1")
  batchCount?: number;        // Images per batch (1-4, default: 1)
  referenceImages?: string[]; // Up to 5 reference images
}