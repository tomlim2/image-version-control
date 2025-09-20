import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { Pixtree, ImageNode } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { showSuccess, showError } from '../utils/output.js';

/**
 * Extract prompt from node's model configuration
 */
function getNodePrompt(node: ImageNode): string {
  if (!node.modelConfig) return '';
  
  // Both NanoBananaGenerationConfig and SeedreamConfig use 'prompt' field
  if ('prompt' in node.modelConfig) {
    return node.modelConfig.prompt || '';
  }
  
  return '';
}

export const exportCommand = new Command('export')
  .description('Export node image to specified location')
  .argument('<nodeId>', 'node ID to export')
  .argument('[outputPath]', 'output file path (default: exports/)')
  .option('-n, --name <name>', 'custom filename')
  .option('-f, --format <format>', 'output format (png, jpg, webp)', 'png')
  .option('--quality <quality>', 'image quality for jpg/webp (1-100)', '90')
  .option('--overwrite', 'overwrite existing files')
  .option('--history', 'show export history for this node instead of exporting')
  .action(async (nodeId, outputPath, options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      // Show export history if requested
      if (options.history) {
        const exportService = pixtree.getExportService();
        const history = await exportService.getExportHistory(nodeId);
        
        console.log(chalk.cyan(`📤 Export History for ${nodeId}`));
        console.log('');
        
        if (history.length === 0) {
          console.log(chalk.gray('No exports found for this node'));
          console.log(chalk.yellow('💡 Use'), chalk.cyan(`pixtree export ${nodeId} [path]`), chalk.yellow('to export this image'));
          return;
        }
        
        history.forEach((record, index) => {
          const prefix = index === history.length - 1 ? '└── ' : '├── ';
          const time = new Date(record.exportedAt).toLocaleString();
          const customName = record.customName ? ` (${record.customName})` : '';
          
          console.log(`${prefix}📁 ${record.path}${customName}`);
          console.log(`    📅 ${chalk.gray('Exported:')} ${time}`);
          console.log(`    📊 ${chalk.gray('Format:')} ${record.format.toUpperCase()}`);
          if (index < history.length - 1) console.log('');
        });
        
        console.log('');
        console.log(chalk.yellow('💡 Use'), chalk.cyan(`pixtree export ${nodeId} [path]`), chalk.yellow('to export again'));
        return;
      }
      
      // Get node info for regular export
      const nodes = await pixtree.search({ text: nodeId });
      if (nodes.length === 0) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      
      const node = nodes[0];
      
      // Determine output path
      let finalOutputPath: string;
      
      if (outputPath) {
        finalOutputPath = path.resolve(outputPath);
      } else {
        // Default to exports directory
        const exportsDir = path.join(projectPath, 'exports');
        let filename = options.name || generateFilename(node);
        
        // Add extension if not present
        const ext = path.extname(filename);
        if (!ext) {
          filename += `.${options.format}`;
        }
        
        finalOutputPath = path.join(exportsDir, filename);
      }
      
      // Check if file exists
      if (!options.overwrite && await fileExists(finalOutputPath)) {
        throw new Error(`File already exists: ${finalOutputPath}. Use --overwrite to replace it.`);
      }
      
      console.log(chalk.cyan('📤 Exporting image...'));
      console.log(`📋 ${chalk.yellow('Node:')} ${nodeId}`);
      console.log(`📁 ${chalk.yellow('Output:')} ${finalOutputPath}`);
      console.log('');
      
      // Export the image
      await pixtree.export(nodeId, finalOutputPath, options.name);
      
      console.log(chalk.green('✅ Image exported successfully!'));
      console.log('');
      
      // Get updated export stats
      const exportService = pixtree.getExportService();
      const exportStats = await exportService.getExportStats(nodeId);
      
      // Show export info
      showSuccess([
        `📁 ${chalk.gray('Exported to:')} ${finalOutputPath}`,
        `🖼️  ${chalk.gray('Source:')} ${node.source === 'generated' ? 'Generated' : 'Imported'}`,
        node.source === 'generated' 
          ? `🎨 ${chalk.gray('Prompt:')} "${getNodePrompt(node)}"`
          : `📸 ${chalk.gray('Original:')} ${node.importInfo?.originalFilename}`,
        `📊 ${chalk.gray('Format:')} ${options.format.toUpperCase()}`,
        `📐 ${chalk.gray('Dimensions:')} ${node.fileInfo.dimensions.width}×${node.fileInfo.dimensions.height}`,
        `📈 ${chalk.gray('Total exports:')} ${exportStats.count} ${exportStats.count > 1 ? `(formats: ${exportStats.formats.join(', ')})` : ''}`
      ]);
      
      console.log('');
      console.log(chalk.yellow('💡 Next steps:'));
      console.log(`   ${chalk.cyan('open "' + finalOutputPath + '"')}     # View exported image`);
      console.log(`   ${chalk.cyan(`pixtree export ${nodeId} --history`)}  # View export history`);
      console.log(`   ${chalk.cyan('pixtree tree')}                        # Back to project tree`);
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Export failed:', error.message);
        
        if (error.message.includes('not found')) {
          console.log(chalk.yellow('💡 Use'), chalk.cyan('pixtree tree'), chalk.yellow('to see available nodes'));
        } else if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        } else if (error.message.includes('already exists')) {
          console.log(chalk.yellow('💡 Use'), chalk.cyan('--overwrite'), chalk.yellow('to replace existing files'));
        }
      }
      process.exit(1);
    }
  });

/**
 * Generate a sensible filename from node data
 */
function generateFilename(node: any): string {
  if (node.source === 'generated' && getNodePrompt(node)) {
    // Use first few words of prompt
    const promptWords = getNodePrompt(node)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 4)
      .join('-');
    
    return `${promptWords}-${node.id.split('-').pop()}`;
  } else if (node.importInfo?.originalFilename) {
    // Use original filename without extension
    const name = path.parse(node.importInfo.originalFilename).name;
    return `${name}-${node.id.split('-').pop()}`;
  } else {
    // Fallback to node ID
    return node.id;
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import('fs-extra');
    return await fs.pathExists(filePath);
  } catch {
    return false;
  }
}