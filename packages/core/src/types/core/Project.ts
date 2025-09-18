/**
 * Project-related types for Pixtree
 */

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