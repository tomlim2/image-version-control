/**
 * Project configuration types for Pixtree
 */

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