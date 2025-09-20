import path from 'path';
import fs from 'fs-extra';
import { ExportRecord, ExportHistory, ExportOptions } from '../types/export/index.js';
import { ImageNode } from '../types/core/index.js';

/**
 * Service for managing image export operations and tracking
 */
export class ExportService {
  private projectPath: string;
  private exportsFilePath: string;
  private exportsCache?: ExportHistory;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.exportsFilePath = path.join(projectPath, '.pixtree', 'exports.json');
  }

  /**
   * Get export history for a specific node
   */
  async getExportHistory(nodeId: string): Promise<ExportRecord[]> {
    const history = await this.loadExportHistory();
    return history[nodeId] || [];
  }

  /**
   * Get export history for all nodes
   */
  async getAllExportHistory(): Promise<ExportHistory> {
    return await this.loadExportHistory();
  }

  /**
   * Record a new export
   */
  async recordExport(
    nodeId: string, 
    exportPath: string, 
    options: ExportOptions = {}
  ): Promise<ExportRecord> {
    const history = await this.loadExportHistory();
    
    const exportRecord: ExportRecord = {
      nodeId,
      path: exportPath,
      exportedAt: new Date(),
      customName: options.customName,
      format: options.format || path.extname(exportPath).slice(1),
    };

    // Add to history
    if (!history[nodeId]) {
      history[nodeId] = [];
    }
    history[nodeId].push(exportRecord);

    // Save updated history
    await this.saveExportHistory(history);
    
    // Update cache
    this.exportsCache = history;

    return exportRecord;
  }

  /**
   * Get export statistics for a node
   */
  async getExportStats(nodeId: string): Promise<{
    count: number;
    lastExportedAt?: Date;
    formats: string[];
  }> {
    const exports = await this.getExportHistory(nodeId);
    
    return {
      count: exports.length,
      lastExportedAt: exports.length > 0 
        ? new Date(Math.max(...exports.map(e => new Date(e.exportedAt).getTime())))
        : undefined,
      formats: [...new Set(exports.map(e => e.format))]
    };
  }

  /**
   * Remove export record
   */
  async removeExportRecord(nodeId: string, exportPath: string): Promise<boolean> {
    const history = await this.loadExportHistory();
    
    if (!history[nodeId]) {
      return false;
    }

    const initialLength = history[nodeId].length;
    history[nodeId] = history[nodeId].filter(record => record.path !== exportPath);
    
    if (history[nodeId].length < initialLength) {
      await this.saveExportHistory(history);
      this.exportsCache = history;
      return true;
    }

    return false;
  }

  /**
   * Clean up old export records (optional maintenance)
   */
  async cleanupOldExports(olderThanDays: number = 30): Promise<number> {
    const history = await this.loadExportHistory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let removedCount = 0;

    for (const nodeId in history) {
      const initialLength = history[nodeId].length;
      history[nodeId] = history[nodeId].filter(record => 
        new Date(record.exportedAt) > cutoffDate
      );
      removedCount += initialLength - history[nodeId].length;
    }

    // Remove empty entries
    for (const nodeId in history) {
      if (history[nodeId].length === 0) {
        delete history[nodeId];
      }
    }

    if (removedCount > 0) {
      await this.saveExportHistory(history);
      this.exportsCache = history;
    }

    return removedCount;
  }

  /**
   * Clean up exports for deleted nodes
   */
  async cleanupExportsForDeletedNodes(existingNodeIds: string[]): Promise<number> {
    const history = await this.loadExportHistory();
    const existingSet = new Set(existingNodeIds);
    let removedCount = 0;

    for (const nodeId in history) {
      if (!existingSet.has(nodeId)) {
        removedCount += history[nodeId].length;
        delete history[nodeId];
      }
    }

    if (removedCount > 0) {
      await this.saveExportHistory(history);
      this.exportsCache = history;
    }

    return removedCount;
  }

  /**
   * Load export history from file
   */
  private async loadExportHistory(): Promise<ExportHistory> {
    if (this.exportsCache) {
      return this.exportsCache;
    }

    try {
      if (await fs.pathExists(this.exportsFilePath)) {
        const data = await fs.readJSON(this.exportsFilePath);
        this.exportsCache = data;
        return data;
      }
    } catch (error) {
      console.warn('Failed to load export history:', error);
    }

    // Return empty history if file doesn't exist or failed to load
    this.exportsCache = {};
    return {};
  }

  /**
   * Save export history to file
   */
  private async saveExportHistory(history: ExportHistory): Promise<void> {
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.exportsFilePath));
      
      // Save with pretty formatting
      await fs.writeJSON(this.exportsFilePath, history, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save export history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.exportsCache = undefined;
  }
}