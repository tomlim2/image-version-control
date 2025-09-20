/**
 * Project-related types for Pixtree
 */

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastAccessed: Date;
}


export interface ProjectCreationOptions {
  name: string;
  description?: string;
  initialTree?: {
    name: string;
    description?: string;
    tags?: string[];
  };
}