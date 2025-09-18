import { Command } from 'commander';
import chalk from 'chalk';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { showSuccess, showError, formatNodeInfo } from '../utils/output.js';

export const tagCommand = new Command('tag')
  .description('Manage node tags')
  .argument('<nodeId>', 'node ID to tag')
  .argument('[tags...]', 'tags to add (space separated)')
  .option('-r, --remove <tags>', 'comma-separated tags to remove')
  .option('-l, --list', 'list all tags in project')
  .option('--rating <rating>', 'set rating (1-5)')
  .option('--favorite', 'mark as favorite')
  .option('--unfavorite', 'remove from favorites')
  .option('--notes <notes>', 'add or update notes')
  .action(async (nodeId, tags, options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      if (options.list) {
        // Show all tags in project
        const allNodes = await pixtree.search({});
        const allTags = new Set<string>();
        
        allNodes.forEach(node => {
          node.tags.forEach(tag => allTags.add(tag));
        });
        
        const tagArray = Array.from(allTags).sort();
        
        console.log(chalk.cyan('🏷️  All tags in project:'));
        console.log('');
        
        if (tagArray.length === 0) {
          console.log(chalk.gray('No tags found'));
        } else {
          tagArray.forEach(tag => {
            const count = allNodes.filter(node => 
              node.tags.includes(tag)
            ).length;
            console.log(`   ${chalk.green(tag)} ${chalk.gray(`(${count} nodes)`)}`);
          });
        }
        
        return;
      }
      
      // Get current node
      const node = await pixtree.search({ text: nodeId });
      if (node.length === 0) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      
      const currentNode = node[0];
      
      // Prepare updates
      const updates: any = {};
      
      // Add tags
      if (tags && tags.length > 0) {
        const currentTags = [...currentNode.tags];
        const newTags = tags.filter((tag: string) => !currentTags.includes(tag));
        
        if (newTags.length > 0) {
          updates.tags = [...currentTags, ...newTags];
          console.log(chalk.green('✅ Added tags:'), newTags.join(', '));
        } else {
          console.log(chalk.yellow('⚠️  All tags already exist'));
        }
      }
      
      // Remove tags
      if (options.remove) {
        const tagsToRemove = options.remove.split(',').map((tag: string) => tag.trim());
        const currentTags = currentNode.tags;
        const filteredTags = currentTags.filter(tag => !tagsToRemove.includes(tag));
        
        if (filteredTags.length !== currentTags.length) {
          updates.tags = filteredTags;
          console.log(chalk.red('🗑️  Removed tags:'), tagsToRemove.join(', '));
        } else {
          console.log(chalk.yellow('⚠️  No matching tags to remove'));
        }
      }
      
      // Set rating
      if (options.rating) {
        const rating = parseInt(options.rating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          throw new Error('Rating must be between 1 and 5');
        }
        updates.rating = rating;
        console.log(chalk.yellow('⭐ Set rating:'), '⭐'.repeat(rating));
      }
      
      // Set favorite status
      if (options.favorite) {
        updates.favorite = true;
        console.log(chalk.red('❤️  Marked as favorite'));
      }
      
      if (options.unfavorite) {
        updates.favorite = false;
        console.log(chalk.gray('💔 Removed from favorites'));
      }
      
      // Set notes
      if (options.notes) {
        updates.notes = options.notes;
        console.log(chalk.blue('📝 Updated notes'));
      }
      
      // Apply updates
      if (Object.keys(updates).length > 0) {
        const updatedNode = await pixtree.updateNode(nodeId, updates);
        
        console.log('');
        console.log(chalk.cyan('📋 Updated node:'));
        showSuccess(formatNodeInfo(updatedNode));
      } else {
        console.log(chalk.gray('No changes made'));
        console.log('');
        showSuccess(formatNodeInfo(currentNode));
      }
      
      console.log('');
      console.log(chalk.yellow('💡 Tag commands:'));
      console.log(`   ${chalk.cyan('pixtree tag ' + nodeId + ' cool awesome')}   # Add tags`);
      console.log(`   ${chalk.cyan('pixtree tag ' + nodeId + ' --remove cool')}  # Remove tags`);
      console.log(`   ${chalk.cyan('pixtree tag ' + nodeId + ' --rating 5')}     # Set rating`);
      console.log(`   ${chalk.cyan('pixtree tag ' + nodeId + ' --favorite')}     # Mark favorite`);
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Tag operation failed:', error.message);
        
        if (error.message.includes('not found')) {
          console.log(chalk.yellow('💡 Use'), chalk.cyan('pixtree tree'), chalk.yellow('to see available nodes'));
        } else if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        }
      }
      process.exit(1);
    }
  });