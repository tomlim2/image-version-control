/**
 * Core type definitions for Pixtree
 * Hierarchy: Project (땅/land) → Trees (나무들) → ImageNodes (이미지들)
 */

// ===== PROJECT LEVEL =====

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastAccessed: Date;
  
  // Project metadata
  metadata: {
    totalTrees: number;
    totalImages: number;
    totalSize: number; // bytes
    tags: string[]; // all unique tags in project
    favoriteCount: number;
    avgRating: number;
  };
  
  // User preferences for this project
  settings: {
    defaultModel: string;
    autoTagging: boolean;
    autoAnalysis: boolean;
    defaultTreeOnImport: string; // tree ID to use for imports
  };
  
  // Access tracking
  stats: {
    totalGenerations: number;
    totalImports: number;
    lastActivity: Date;
    mostUsedModels: Record<string, number>;
    topTags: Record<string, number>;
  };
}

// ===== TREE LEVEL =====

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

// ===== IMAGE NODE LEVEL =====

export interface ImageNode {
  id: string;
  projectId: string;
  treeId: string;
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
  
  // User-managed metadata
  userMetadata: {
    tags: string[]; // User-defined tags
    favorite: boolean;
    rating?: number; // 1-5 star rating
    notes?: string; // User notes
    collections: string[]; // Collection names
    purpose?: string; // what this image is for
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

// ===== SYSTEM CONFIGURATION =====

export interface ProjectConfig {
  name: string;
  version: string;
  projectId: string;
  currentTreeId?: string; // active tree context
  currentNodeId?: string; // active node context
  
  // AI provider configurations
  aiProviders: {
    [providerName: string]: {
      enabled: boolean;
      apiKey?: string;
      defaultConfig?: Record<string, any>;
    };
  };
  
  // Storage settings (simplified)
  storage: {
    // Future: could add storage-related settings here
  };
  
  // User preferences
  preferences: {
    defaultModel: string;
  };
  
  // Project-level metadata
  projectMetadata: {
    createdAt: Date;
    lastBackup?: Date;
  };
}

// ===== TREE STRUCTURES =====

export interface TreeNode {
  node: ImageNode;
  children: TreeNode[];
  depth: number;
}

export interface ProjectTreeStructure {
  project: Project;
  trees: TreeWithNodes[];
}

export interface TreeWithNodes {
  tree: Tree;
  rootNode?: ImageNode;
  totalNodes: number;
  visualTree: TreeNode[];
}

// ===== OPERATION OPTIONS =====

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

export interface ImportOptions {
  treeId?: string; // target tree, creates new one if not specified
  parentId?: string;
  description?: string;
  importMethod: 'root' | 'child' | 'editing-base';
  analyzeWithAI?: boolean;
  tags?: string[];
  treeTags?: string[]; // tags for new tree if auto-creating
  treeName?: string; // name for new tree if auto-creating
  purpose?: string;
}

export interface ProjectCreationOptions {
  name: string;
  description?: string;
  defaultModel?: string;
  initialTree?: {
    name: string;
    description?: string;
    tags?: string[];
  };
}

export interface TreeCreationOptions {
  name: string;
  description?: string;
  purpose?: string;
  tags?: string[];
  projectId: string;
}

// ===== SEARCH AND FILTERING =====

export interface SearchOptions {
  text?: string; // search in prompts, descriptions, notes
  tags?: string[]; // must have all these tags
  rating?: number; // minimum rating
  source?: 'generated' | 'imported';
  model?: string;
  treeId?: string;
  favorite?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasChildren?: boolean;
  isLeaf?: boolean;
}

export interface ProjectSearchOptions extends SearchOptions {
  treeTags?: string[]; // filter by tree tags instead of types
}

// ===== CONTEXT MANAGEMENT =====

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

// ===== EXISTING INTERFACES (updated) =====

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

// ===== STATISTICS =====

export interface ProjectStats {
  totalImages: number;
  totalNodes: number;
  totalTrees: number;
  totalSize: number;
  imagesByRating: Record<string, number>;
  imagesByModel: Record<string, number>;
  imagesByTree: Record<string, number>;
  tagUsage: Record<string, number>;
  activityByDate: Record<string, number>;
  averageGenerationTime: number;
  mostActiveTree: string;
  favoriteCount: number;
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