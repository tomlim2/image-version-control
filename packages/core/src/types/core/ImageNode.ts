// Nano Banana (Gemini 2.5 Flash Image) generation configuration
export interface NanoBananaGenerationConfig {
  prompt: string;
  
  // Generation parameters (Gemini API standard)
  temperature?: number;        // 0.0-1.0, controls creativity/randomness
  topP?: number;              // Token selection probability threshold
  topK?: number;              // Number of top tokens to consider
  candidateCount?: number;    // Number of candidate responses to generate
  maxOutputTokens?: number;   // Maximum output tokens
  seed?: number;              // Seed for reproducible results
  
  // Image-specific parameters
  aspectRatio?: string;       // Image aspect ratio
  batchCount?: number;        // Images per batch (1-4)
  
  // Input data
  mimeType?: string;
  imageInput?: string;        // base64 encoded image
  referenceImages?: string[]; // Up to 5 reference images
}

export interface SeedreamConfig {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
  width?: number; // 1024-4096px
  height?: number; // 1024-4096px
  maxImages?: number; // 1-15
  referenceImages?: string[]; // Up to 3 reference URLs
}

export interface ImageNode {
  id: string;
  projectId: string;
  treeId: string;
  parentId?: string;
  imagePath: string;
  imageHash: string;
  tags: string[];
  model?: string; // exists for generated images, undefined for imported images
  modelConfig?: NanoBananaGenerationConfig | SeedreamConfig;
  importInfo?: {
    originalPath: string;
    originalFilename: string;
  };  
  userSettings: {
    favorite: boolean;
    rating?: number; // 1-5 star rating
    description?: string; // User description/notes
  };
  exportCount?: number;
  lastExportedAt?: Date;
  createdAt: Date;
  lastAccessed: Date;  
  fileInfo: {
    fileSize: number;
    dimensions: { width: number; height: number };
    format: string;
    generationTime?: number; // seconds
    colorProfile?: string;
    hasAlpha: boolean;
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