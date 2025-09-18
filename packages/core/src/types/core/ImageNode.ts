/**
 * ImageNode-related types for Pixtree
 */

export interface ImageNode {
  id: string;
  projectId: string;
  treeId: string;
  parentId?: string;
  imagePath: string;
  imageHash: string;
  
  // User-defined tags (moved to top level for better accessibility)
  tags: string[];
  
  // Source information
  source: 'generated' | 'imported';
  model?: string; // AI model used (nano-banana, seedream-4.0, etc.)
  
  // Generation parameters (for AI-generated images)
  generationParams?: {
    prompt: string;
    negativePrompt?: string;
    modelConfig: Record<string, any>; // Model-specific config
    derivedFrom?: string; // node ID this was derived from
  };
  
  // Import information (for imported images)
  importInfo?: {
    originalPath: string;
    originalFilename: string;
    userDescription?: string;
    importMethod: 'root' | 'child' | 'editing-base';
    autoAssignedTree?: boolean; // was tree auto-assigned during import
  };
  
  // User-managed metadata (simplified)
  userMetadata: {
    favorite: boolean;
    rating?: number; // 1-5 star rating
    description?: string; // User description/notes
  };
  
  // Export tracking
  exports?: {
    path: string;
    exportedAt: Date;
    customName?: string;
    format: string;
  }[];
  
  // System metadata
  success: boolean;
  error?: string;
  createdAt: Date;
  lastAccessed: Date;
  
  metadata: {
    fileSize: number;
    dimensions: { width: number; height: number };
    format: string;
    generationTime?: number; // seconds
    colorProfile?: string;
    hasAlpha: boolean;
  };
  
  // AI analysis (optional)
  aiAnalysis?: {
    description: string;
    detectedObjects: string[];
    style: string;
    confidence: number;
    mood?: string;
    composition?: string;
  };
  
  // Tree position info
  treePosition: {
    depth: number;
    childIndex: number; // position among siblings
    hasChildren: boolean;
    isLeaf: boolean;
  };
}

export interface DiffResult {
  node1: ImageNode;
  node2: ImageNode;
  similarity: number; // 0-1
  differences: {
    promptDiff?: string;
    configDiff?: Record<string, any>;
    visualDiff?: any; // Will be enhanced later
    treeDiff?: {
      sameTree: boolean;
      sameProject: boolean;
    };
  };
}

export interface MergeStrategy {
  type: 'blend' | 'combine' | 'average';
  weights?: { node1: number; node2: number };
  customPrompt?: string;
  targetTreeId?: string; // where to place merged result
}

export interface BlendPreview {
  resultPrompt: string;
  explanation: string;
  expectedChanges: string[];
  confidence: number;
  suggestedTreeId?: string;
  suggestedTags?: string[];
}