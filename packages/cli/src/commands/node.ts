import { Command } from 'commander';
import chalk from 'chalk';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { showSuccess, showError, formatNodeInfo } from '../utils/output.js';

export const nodeCommand = new Command('node')
  .description('Manage image nodes (ImageNode operations)')
  .argument('<nodeId>', 'node ID to operate on')
  .argument('<action>', 'action to perform (tag, rating, favorite, info, description)')
  .argument('[...args]', 'additional arguments')
  .action(async (nodeId, action, args, options) => {
    try {
      switch (action) {
        case 'tag':
          const subAction = args[0];
          const tagValues = args.slice(1);
          await handleTagAction(nodeId, subAction, tagValues);
          break;
        case 'rating':
          await handleRating(nodeId, args[0]);
          break;
        case 'favorite':
          await handleFavorite(nodeId, true);
          break;
        case 'unfavorite':
          await handleFavorite(nodeId, false);
          break;
        case 'info':
          await handleInfo(nodeId);
          break;
        case 'description':
          const description = args.join(' ');
          await handleDescription(nodeId, description);
          break;
        default:
          console.log(chalk.red(`❌ Unknown action: ${action}`));
          console.log(chalk.yellow('💡 Available actions: tag, rating, favorite, unfavorite, info, description'));
          console.log('');
          console.log(chalk.yellow('Examples:'));
          console.log(`   ${chalk.cyan(`pixtree node ${nodeId} info`)}`);
          console.log(`   ${chalk.cyan(`pixtree node ${nodeId} tag add cool awesome`)}`);
          console.log(`   ${chalk.cyan(`pixtree node ${nodeId} rating 5`)}`);
          console.log(`   ${chalk.cyan(`pixtree node ${nodeId} favorite`)}`);
          process.exit(1);
      }
    } catch (error) {
      showError('Node operation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Handle tag actions  
async function handleTagAction(nodeId: string, subAction: string, tags: string[]) {
  
  switch (subAction) {
    case 'add':
      if (tags.length === 0) {
        console.log(chalk.red('❌ Please specify tags to add'));
        console.log(chalk.yellow('💡 Example:'), chalk.cyan(`pixtree node ${nodeId} tag add cool awesome`));
        return;
      }
      await handleTagAdd(nodeId, tags);
      break;
    case 'remove':
      if (tags.length === 0) {
        console.log(chalk.red('❌ Please specify tags to remove'));
        console.log(chalk.yellow('💡 Example:'), chalk.cyan(`pixtree node ${nodeId} tag remove old`));
        return;
      }
      await handleTagRemove(nodeId, tags);
      break;
    case 'list':
      await handleTagList(nodeId);
      break;
    case 'clear':
      await handleTagClear(nodeId);
      break;
    default:
      console.log(chalk.red(`❌ Unknown tag action: ${subAction}`));
      console.log(chalk.yellow('💡 Available tag actions: add, remove, list, clear'));
      console.log('');
      console.log(chalk.yellow('Examples:'));
      console.log(`   ${chalk.cyan(`pixtree node ${nodeId} tag add cool awesome`)}`);
      console.log(`   ${chalk.cyan(`pixtree node ${nodeId} tag remove old`)}`);
      console.log(`   ${chalk.cyan(`pixtree node ${nodeId} tag list`)}`);
      console.log(`   ${chalk.cyan(`pixtree node ${nodeId} tag clear`)}`);
      break;
  }
}

// Implementation functions
async function handleTagAdd(nodeId: string, tags: string[]) {
  try {
    const projectPath = getProjectPath({});
    const pixtree = new Pixtree(projectPath);
    
    const node = await (pixtree as any).storage.loadNode(nodeId);
    const currentTags = [...node.tags];
    const newTags = tags.filter((tag: string) => !currentTags.includes(tag));
    
    if (newTags.length === 0) {
      console.log(chalk.yellow('⚠️  All tags already exist on this node'));
      return;
    }
    
    const updatedTags = [...currentTags, ...newTags];
    const updatedNode = await pixtree.updateNode(nodeId, { tags: updatedTags });
    
    console.log(chalk.green('✅ Added tags:'), chalk.cyan(newTags.join(', ')));
    console.log(chalk.gray('📋 All tags:'), updatedNode.tags.join(', '));
    
  } catch (error) {
    showError('Failed to add tags:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleTagRemove(nodeId: string, tags: string[]) {
  try {
    const projectPath = getProjectPath({});
    const pixtree = new Pixtree(projectPath);
    
    const node = await (pixtree as any).storage.loadNode(nodeId);
    const currentTags = node.tags;
    const filteredTags = currentTags.filter((tag: string) => !tags.includes(tag));
    
    if (filteredTags.length === currentTags.length) {
      console.log(chalk.yellow('⚠️  No matching tags found to remove'));
      return;
    }
    
    const updatedNode = await pixtree.updateNode(nodeId, { tags: filteredTags });
    const removedTags = tags.filter(tag => currentTags.includes(tag));
    
    console.log(chalk.red('🗑️  Removed tags:'), chalk.cyan(removedTags.join(', ')));
    console.log(chalk.gray('📋 Remaining tags:'), updatedNode.tags.join(', ') || chalk.gray('(none)'));
    
  } catch (error) {
    showError('Failed to remove tags:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleTagList(nodeId: string) {
  try {
    const projectPath = getProjectPath({});
    const pixtree = new Pixtree(projectPath);
    
    const node = await (pixtree as any).storage.loadNode(nodeId);
    
    console.log(chalk.cyan(`🏷️  Tags for node ${nodeId}:`));
    if (node.tags.length === 0) {
      console.log(chalk.gray('   (no tags)'));
    } else {
      node.tags.forEach((tag: string, index: number) => {
        console.log(`   ${index + 1}. ${chalk.green(tag)}`);
      });
    }
    
  } catch (error) {
    showError('Failed to list tags:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleTagClear(nodeId: string) {
  try {
    const projectPath = getProjectPath({});
    const pixtree = new Pixtree(projectPath);
    
    const node = await (pixtree as any).storage.loadNode(nodeId);
    
    if (node.tags.length === 0) {
      console.log(chalk.yellow('⚠️  Node has no tags to clear'));
      return;
    }
    
    const clearedTags = [...node.tags];
    await pixtree.updateNode(nodeId, { tags: [] });
    
    console.log(chalk.red('🗑️  Cleared all tags:'), chalk.cyan(clearedTags.join(', ')));
    
  } catch (error) {
    showError('Failed to clear tags:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleRating(nodeId: string, ratingStr: string) {
  try {
    const rating = parseInt(ratingStr);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const projectPath = getProjectPath({});
    const pixtree = new Pixtree(projectPath);
    
    await pixtree.updateNode(nodeId, { rating });
    
    console.log(chalk.yellow('⭐ Set rating:'), '⭐'.repeat(rating) + '☆'.repeat(5 - rating), chalk.gray(`(${rating}/5)`));
    
  } catch (error) {
    showError('Failed to set rating:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleFavorite(nodeId: string, favorite: boolean) {
  try {
    const projectPath = getProjectPath({});
    const pixtree = new Pixtree(projectPath);
    
    await pixtree.updateNode(nodeId, { favorite });
    
    if (favorite) {
      console.log(chalk.red('❤️  Added to favorites'));
    } else {
      console.log(chalk.gray('💔 Removed from favorites'));
    }
    
  } catch (error) {
    showError('Failed to update favorite status:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleInfo(nodeId: string) {
  try {
    const projectPath = getProjectPath({});
    const pixtree = new Pixtree(projectPath);
    
    const node = await (pixtree as any).storage.loadNode(nodeId);
    
    console.log(chalk.cyan('📋 Node Information:'));
    showSuccess(formatNodeInfo(node));
    
    // Show additional helpful commands
    console.log('');
    console.log(chalk.yellow('💡 Node commands:'));
    console.log(`   ${chalk.cyan(`pixtree node ${nodeId} tag add <tags>`)}        # Add tags`);
    console.log(`   ${chalk.cyan(`pixtree node ${nodeId} rating <1-5>`)}          # Set rating`);
    console.log(`   ${chalk.cyan(`pixtree node ${nodeId} favorite`)}              # Mark favorite`);
    console.log(`   ${chalk.cyan(`pixtree node ${nodeId} description "text"`)}    # Set description`);
    console.log(`   ${chalk.cyan(`pixtree export ${nodeId}`)}                    # Export image`);
    
  } catch (error) {
    showError('Failed to get node info:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleDescription(nodeId: string, description: string) {
  try {
    const projectPath = getProjectPath({});
    const pixtree = new Pixtree(projectPath);
    
    await pixtree.updateNode(nodeId, { description });
    
    console.log(chalk.blue('📝 Updated description:'));
    console.log(`   "${description}"`);
    
  } catch (error) {
    showError('Failed to set description:', error instanceof Error ? error.message : 'Unknown error');
  }
}