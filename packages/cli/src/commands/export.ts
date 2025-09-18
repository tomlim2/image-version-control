import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { showSuccess, showError } from '../utils/output.js';

export const exportCommand = new Command('export')
  .description('Export node image to specified location')
  .argument('<nodeId>', 'node ID to export')
  .argument('[outputPath]', 'output file path (default: exports/)')
  .option('-n, --name <name>', 'custom filename')
  .option('-f, --format <format>', 'output format (png, jpg, webp)', 'png')
  .option('--quality <quality>', 'image quality for jpg/webp (1-100)', '90')
  .option('--overwrite', 'overwrite existing files')
  .action(async (nodeId, outputPath, options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      // Get node info
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
      
      // Show export info
      showSuccess([
        `📁 ${chalk.gray('Exported to:')} ${finalOutputPath}`,
        `🖼️  ${chalk.gray('Source:')} ${node.source === 'generated' ? 'Generated' : 'Imported'}`,
        node.source === 'generated' 
          ? `🎨 ${chalk.gray('Prompt:')} "${node.generationParams?.prompt}"`
          : `📸 ${chalk.gray('Original:')} ${node.importInfo?.originalFilename}`,
        `📊 ${chalk.gray('Format:')} ${options.format.toUpperCase()}`,
        `📐 ${chalk.gray('Dimensions:')} ${node.metadata.dimensions.width}×${node.metadata.dimensions.height}`
      ]);
      
      console.log('');
      console.log(chalk.yellow('💡 Next steps:'));
      console.log(`   ${chalk.cyan('open "' + finalOutputPath + '"')}     # View exported image`);
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
  if (node.source === 'generated' && node.generationParams?.prompt) {
    // Use first few words of prompt
    const promptWords = node.generationParams.prompt
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