import { Command } from 'commander';
import chalk from 'chalk';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { showError } from '../utils/output.js';

export const statusCommand = new Command('status')
  .description('Show current project, tree, and node status')
  .option('-v, --verbose', 'show detailed information')
  .option('--tree-only', 'show only tree information')
  .option('--node-only', 'show only node information')
  .action(async (options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      // Get current context
      const context = await (pixtree as any).storage.loadContext();
      const project = await (pixtree as any).projectManager.getProject();
      
      // Show project info
      if (!options.treeOnly && !options.nodeOnly) {
        console.log(chalk.cyan('📁 Project Status:'));
        console.log(`   ${chalk.yellow('Name:')} ${project.name}`);
        console.log(`   ${chalk.yellow('Location:')} ${projectPath}`);
        console.log(`   ${chalk.yellow('Created:')} ${new Date(project.createdAt).toLocaleDateString()}`);
        console.log('');
      }
      
      // Show tree status
      if (!options.nodeOnly) {
        console.log(chalk.cyan('🌳 Tree Status:'));
        if (context.currentTree) {
          console.log(`   ${chalk.yellow('Current Tree:')} ${chalk.green(context.currentTree.name)}`);
          console.log(`   ${chalk.yellow('Tree ID:')} ${chalk.gray(context.currentTree.id)}`);
          if (context.currentTree.description) {
            console.log(`   ${chalk.yellow('Description:')} ${context.currentTree.description}`);
          }
          if (context.currentTree.tags && context.currentTree.tags.length > 0) {
            console.log(`   ${chalk.yellow('Tags:')} ${context.currentTree.tags.join(', ')}`);
          }
          console.log(`   ${chalk.yellow('Created:')} ${new Date(context.currentTree.createdAt).toLocaleDateString()}`);
          
          if (options.verbose) {
            // Show tree statistics
            const allProjectNodes = await pixtree.search({});
            const treeNodes = allProjectNodes.filter(node => node.treeId === context.currentTree.id);
            const importedNodes = treeNodes.filter(node => !node.model);
            const generatedNodes = treeNodes.filter(node => node.model);
            const favoriteNodes = treeNodes.filter(node => node.userSettings?.favorite);
            
            console.log(`   ${chalk.yellow('Statistics:')}`);
            console.log(`     Total nodes: ${chalk.cyan(treeNodes.length)}`);
            console.log(`     Imported: ${chalk.cyan(importedNodes.length)}`);
            console.log(`     Generated: ${chalk.cyan(generatedNodes.length)}`);
            console.log(`     Favorites: ${chalk.cyan(favoriteNodes.length)}`);
          }
        } else {
          console.log(`   ${chalk.red('No tree selected')}`);
          console.log(`   ${chalk.yellow('💡 Create a tree:')} ${chalk.cyan('pixtree tree create <name>')}`);
        }
        console.log('');
      }
      
      // Show node status
      if (!options.treeOnly) {
        console.log(chalk.cyan('📷 Node Status:'));
        if (context.currentNode) {
          console.log(`   ${chalk.yellow('Current Node:')} ${chalk.green(context.currentNode.id)}`);
          
          // Determine node type
          const nodeType = context.currentNode.model ? 'Generated' : 'Imported';
          const typeColor = context.currentNode.model ? chalk.blue : chalk.green;
          console.log(`   ${chalk.yellow('Type:')} ${typeColor(nodeType)}`);
          
          if (context.currentNode.model) {
            console.log(`   ${chalk.yellow('Model:')} ${context.currentNode.model}`);
          }
          
          if (context.currentNode.userSettings?.description) {
            console.log(`   ${chalk.yellow('Description:')} ${context.currentNode.userSettings.description}`);
          }
          
          if (context.currentNode.tags && context.currentNode.tags.length > 0) {
            console.log(`   ${chalk.yellow('Tags:')} ${context.currentNode.tags.join(', ')}`);
          }
          
          if (context.currentNode.userSettings?.rating) {
            const rating = context.currentNode.userSettings.rating;
            console.log(`   ${chalk.yellow('Rating:')} ${'⭐'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`);
          }
          
          if (context.currentNode.userSettings?.favorite) {
            console.log(`   ${chalk.red('❤️  Favorite')}`);
          }
          
          console.log(`   ${chalk.yellow('Created:')} ${new Date(context.currentNode.createdAt).toLocaleDateString()}`);
          
          if (options.verbose) {
            console.log(`   ${chalk.yellow('Image Path:')} ${context.currentNode.imagePath}`);
            console.log(`   ${chalk.yellow('Image Hash:')} ${context.currentNode.imageHash}`);
            if (context.currentNode.parentId) {
              console.log(`   ${chalk.yellow('Parent Node:')} ${context.currentNode.parentId}`);
            }
            if (context.currentNode.fileInfo) {
              const fileInfo = context.currentNode.fileInfo;
              console.log(`   ${chalk.yellow('File Size:')} ${(fileInfo.fileSize / 1024 / 1024).toFixed(2)} MB`);
              if (fileInfo.dimensions) {
                console.log(`   ${chalk.yellow('Dimensions:')} ${fileInfo.dimensions.width}×${fileInfo.dimensions.height}`);
              }
            }
          }
        } else {
          console.log(`   ${chalk.red('No node selected')}`);
          console.log(`   ${chalk.yellow('💡 Import or generate:')} ${chalk.cyan('pixtree import <image>')} or ${chalk.cyan('pixtree generate <prompt>')}`);
        }
        console.log('');
      }
      
      // Show helpful next steps
      if (!options.verbose && !options.treeOnly && !options.nodeOnly) {
        console.log(chalk.yellow('💡 Quick commands:'));
        if (context.currentNode) {
          console.log(`   ${chalk.cyan(`pixtree node ${context.currentNode.id} info`)}         # Detailed node info`);
          console.log(`   ${chalk.cyan(`pixtree generate "prompt"`)}                        # Generate from current`);
          console.log(`   ${chalk.cyan(`pixtree export ${context.currentNode.id}`)}         # Export current image`);
        }
        if (context.currentTree) {
          console.log(`   ${chalk.cyan('pixtree tree')}                                    # View tree structure`);
        }
        console.log(`   ${chalk.cyan('pixtree status -v')}                               # Verbose status`);
      }
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Status check failed:', error.message);
        
        if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Initialize project:'), chalk.cyan('pixtree init'));
        }
      }
      process.exit(1);
    }
  });