/**
 * Export-related types for Pixtree
 */

export interface ExportRecord {
  nodeId: string;
  path: string;
  exportedAt: Date;
  customName?: string;
  format: string;
  originalPath?: string; // 원본 이미지 경로 (참조용)
}

export interface ExportHistory {
  [nodeId: string]: ExportRecord[];
}

export interface ExportOptions {
  format?: string;
  quality?: number;
  customName?: string;
  overwrite?: boolean;
}