/**
 * Search and filtering types for Pixtree
 */

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