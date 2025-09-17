/**
 * Core type definitions for Pixtree
 */

export interface ImageNode {
  id: string;
  parentId?: string;
  imagePath: string;
  imageHash: string;
  
  // Source information
  source: 'generated' | 'imported';
  model?: string; // AI model used (nano-banana, seedream-4.0, etc.)
  
  // Generation parameters (for AI-generated images)
  generationParams?: {
    prompt: string;
    negativePrompt?: string;
    modelConfig: Record<string, any>; // Model-specific config
  };
  
  // Import information (for imported images)
  importInfo?: {
    originalPath: string;
    originalFilename: string;
    userDescription?: string;
    importMethod: 'root' | 'child' | 'editing-base';
  };
  
  // User-managed metadata
  userMetadata: {
    tags: string[]; // User-defined tags
    favorite: boolean;
    rating?: number; // 1-5 star rating
    notes?: string; // User notes
    collections: string[]; // Collection names
  };
  
  // Export tracking
  exports?: {
    path: string;
    exportedAt: Date;
    customName?: string;
  }[];
  
  // System metadata
  success: boolean;
  error?: string;
  timestamp: Date;
  
  metadata: {
    fileSize: number;
    dimensions: { width: number; height: number };
    format: string;
    generationTime?: number; // seconds
  };
  
  // AI analysis (optional)
  aiAnalysis?: {
    description: string;
    detectedObjects: string[];
    style: string;
    confidence: number;
  };
}

export interface ProjectConfig {
  name: string;
  version: string;
  currentNodeId?: string;
  
  // AI provider configurations
  aiProviders: {
    [providerName: string]: {
      enabled: boolean;
      apiKey?: string;
      defaultConfig?: Record<string, any>;
    };
  };
  
  // Storage settings
  storage: {
    autoCleanup: boolean;
    compressionThreshold: number; // rating below which to compress
    deleteThreshold: number; // rating below which to delete
    maxStorageSize?: string; // e.g., "10GB"
  };
  
  // User preferences
  preferences: {
    defaultModel: string;
    autoExportFavorites: boolean;
    autoExportPath?: string;
    showThumbnails: boolean;
  };
}

export interface TreeNode {
  node: ImageNode;
  children: TreeNode[];
  depth: number;
}

export interface GenerateOptions {
  model: string;
  parentId?: string;
  modelConfig?: Record<string, any>;
  tags?: string[];
  rating?: number;
}

export interface ImportOptions {
  parentId?: string;
  description?: string;
  importMethod: 'root' | 'child' | 'editing-base';
  analyzeWithAI?: boolean;
  tags?: string[];
}

export interface DiffResult {
  node1: ImageNode;
  node2: ImageNode;
  similarity: number; // 0-1
  differences: {
    promptDiff?: string;
    configDiff?: Record<string, any>;
    visualDiff?: any; // Will be enhanced later
  };
}

export interface MergeStrategy {
  type: 'blend' | 'combine' | 'average';
  weights?: { node1: number; node2: number };
  customPrompt?: string;
}

export interface BlendPreview {
  resultPrompt: string;
  explanation: string;
  expectedChanges: string[];
  confidence: number;
}