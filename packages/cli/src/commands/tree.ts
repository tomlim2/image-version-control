import { Command } from 'commander';
import chalk from 'chalk';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { displayTree, showError, showSuccess } from '../utils/output.js';

export const treeCommand = new Command('tree')
  .description('Manage project trees');

// Subcommand: tree list (default)
const listCommand = new Command('list')
  .description('Show project tree structure')
  .option('--tags <tags>', 'filter by comma-separated tags')
  .option('--model <model>', 'filter by AI model')
  .option('--rating <rating>', 'filter by minimum rating (1-5)')
  .option('--favorites', 'show only favorites')
  .option('--generated', 'show only generated images')
  .option('--imported', 'show only imported images')
  .option('--failed', 'show only failed generations')
  .option('--since <date>', 'show nodes created since date (YYYY-MM-DD)')
  .option('--trees-only', 'show only tree overview without individual images')
  .action(async (options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      // Get project and workspace context
      const [project, context, trees] = await Promise.all([
        pixtree.getProject(),
        pixtree.getWorkspaceContext(),
        pixtree.getTrees()
      ]);
      
      // Show project header
      console.log(chalk.cyan('🌳 ' + project.name));
      if (project.description) {
        console.log(chalk.gray('   ' + project.description));
      }
      console.log('');
      
      // Show trees overview if requested
      if (options.treesOnly) {
        console.log(chalk.cyan('📁 Available trees:'));
        trees.forEach(tree => {
          const isCurrent = tree.id === context.currentTree?.id;
          console.log(`  ${isCurrent ? '→' : ' '} ${chalk.bold(tree.name)} ${isCurrent ? chalk.gray('(current)') : ''}`);
          console.log(`    ${chalk.gray(tree.description || 'No description')}`);
        });
        return;
      }
      
      // Build search query from options
      const searchQuery: any = {};
      
      if (options.tags) {
        searchQuery.tags = options.tags.split(',').map((tag: string) => tag.trim());
      }
      
      if (options.model) {
        searchQuery.model = options.model;
      }
      
      if (options.rating) {
        const rating = parseInt(options.rating);
        if (isNaN(rating) || rating < 1 || rating > 5) {
          throw new Error('Rating must be between 1 and 5');
        }
        searchQuery.minRating = rating;
      }
      
      if (options.since) {
        const date = new Date(options.since);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format. Use YYYY-MM-DD');
        }
        searchQuery.dateRange = { from: date };
      }
      
      // Show full project structure: Project → Trees → Nodes
      console.log(chalk.cyan('📁 Project trees:'));
      for (const tree of trees) {
        const isCurrent = tree.id === context.currentTree?.id;
        console.log(`  ${isCurrent ? '→' : ' '} ${chalk.bold(tree.name)} ${isCurrent ? chalk.gray('(current)') : ''}`);
        console.log(`    ${chalk.gray(tree.description || 'No description')}`);
        
        // Show basic tree stats (calculated dynamically)
        console.log(`    ${chalk.gray('Created:')} ${new Date(tree.createdAt).toLocaleDateString()}`);
      }
      
      // Show current context
      if (context.currentTree) {
        console.log('');
        console.log(chalk.gray('💡 Current tree:'), chalk.cyan(context.currentTree.name));
        console.log(chalk.gray('   Use'), chalk.cyan('pixtree tree switch <tree-name>'), chalk.gray('to change trees'));
      }
      
      if (context.currentNode) {
        console.log(chalk.gray('💡 Current node:'), chalk.cyan(context.currentNode.id));
        console.log(chalk.gray('   Use'), chalk.cyan('pixtree checkout <node-id>'), chalk.gray('to switch nodes'));
      }
      
      
      // Show helpful commands
      console.log('');
      console.log(chalk.yellow('💡 Useful commands:'));
      console.log(`   ${chalk.cyan('pixtree tree --favorites')}        # Show only favorites`);
      console.log(`   ${chalk.cyan('pixtree tree --tags cat,cute')}    # Filter by tags`);
      console.log(`   ${chalk.cyan('pixtree tree --rating 4')}         # Show 4+ star images`);
      console.log(`   ${chalk.cyan('pixtree tree --model nano-banana')} # Filter by model`);
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Failed to show tree:', error.message);
        
        if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        }
      }
      process.exit(1);
    }
  });

// Subcommand: tree create
const createCommand = new Command('create')
  .description('Create a new tree')
  .argument('<name>', 'tree name')
  .option('-d, --description <desc>', 'tree description')
  .option('-t, --tags <tags>', 'comma-separated tags')
  .action(async (name, options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      const tags = options.tags ? options.tags.split(',').map((tag: string) => tag.trim()) : [];
      
      const tree = await pixtree.createTree({
        name,
        description: options.description,
        tags
      });
      
      console.log(chalk.green('✅ Tree created successfully!'));
      console.log('');
      console.log(chalk.cyan(`📁 Tree: ${tree.name}`));
      if (tree.description) {
        console.log(chalk.gray(`   Description: ${tree.description}`));
      }
      if (tree.tags.length > 0) {
        console.log(chalk.gray(`   Tags: ${tree.tags.join(', ')}`));
      }
      console.log('');
      console.log(chalk.yellow('🎯 Next steps:'));
      console.log(`   ${chalk.cyan(`pixtree tree switch "${name}"`)}    # Switch to this tree`);
      console.log(`   ${chalk.cyan('pixtree generate "prompt"')}      # Generate images in this tree`);
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Failed to create tree:', error.message);
        
        if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        } else if (error.message.includes('already exists')) {
          console.log(chalk.yellow('💡 Use'), chalk.cyan('pixtree tree list'), chalk.yellow('to see existing trees'));
        }
      }
      process.exit(1);
    }
  });

// Subcommand: tree switch  
const switchCommand = new Command('switch')
  .description('Switch to a tree')
  .argument('<name>', 'tree name or ID')
  .action(async (name, options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      const tree = await pixtree.switchToTree(name);
      
      console.log(chalk.green('✅ Switched to tree:'), chalk.cyan(tree.name));
      console.log('');
      if (tree.description) {
        console.log(chalk.gray(`Description: ${tree.description}`));
      }
      if (tree.tags.length > 0) {
        console.log(chalk.gray(`Tags: ${tree.tags.join(', ')}`));
      }
      console.log('');
      console.log(chalk.yellow('💡 From here you can:'));
      console.log(`   ${chalk.cyan('pixtree generate "prompt"')}      # Generate images in this tree`);
      console.log(`   ${chalk.cyan('pixtree import image.jpg')}       # Import images to this tree`);
      console.log(`   ${chalk.cyan('pixtree tree list')}              # View all trees`);
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Failed to switch tree:', error.message);
        
        if (error.message.includes('not found')) {
          console.log(chalk.yellow('💡 Use'), chalk.cyan('pixtree tree list'), chalk.yellow('to see available trees'));
        } else if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        }
      }
      process.exit(1);
    }
  });

// Subcommand: tree current
const currentCommand = new Command('current')
  .description('Show current tree')
  .action(async (options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      const context = await pixtree.getWorkspaceContext();
      
      if (!context.currentTree) {
        console.log(chalk.yellow('⚠️  No tree selected'));
        console.log('');
        console.log(chalk.yellow('💡 Get started:'));
        console.log(`   ${chalk.cyan('pixtree tree create "my-tree"')}    # Create a new tree`);
        console.log(`   ${chalk.cyan('pixtree tree switch "my-tree"')}    # Switch to a tree`);
        return;
      }
      
      console.log(chalk.cyan('📁 Current tree:'), chalk.bold(context.currentTree.name));
      if (context.currentTree.description) {
        console.log(chalk.gray(`   Description: ${context.currentTree.description}`));
      }
      if (context.currentTree.tags.length > 0) {
        console.log(chalk.gray(`   Tags: ${context.currentTree.tags.join(', ')}`));
      }
      console.log(chalk.gray(`   Created: ${new Date(context.currentTree.createdAt).toLocaleDateString()}`));
      
      if (context.currentNode) {
        console.log('');
        console.log(chalk.cyan('📍 Current node:'), chalk.bold(context.currentNode.id));
      }
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Failed to show current tree:', error.message);
        
        if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        }
      }
      process.exit(1);
    }
  });

// Subcommand: tree delete
const deleteCommand = new Command('delete')
  .description('Delete a tree')
  .argument('<name>', 'tree name or ID')
  .option('--force', 'force deletion without confirmation')
  .action(async (name, options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      if (!options.force) {
        console.log(chalk.yellow('⚠️  This will permanently delete the tree and all its images!'));
        console.log(chalk.gray('   Use --force to skip this confirmation'));
        return;
      }
      
      await pixtree.deleteTree(name);
      
      console.log(chalk.green('✅ Tree deleted successfully!'));
      console.log('');
      console.log(chalk.yellow('💡 Use'), chalk.cyan('pixtree tree list'), chalk.yellow('to see remaining trees'));
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Failed to delete tree:', error.message);
        
        if (error.message.includes('not found')) {
          console.log(chalk.yellow('💡 Use'), chalk.cyan('pixtree tree list'), chalk.yellow('to see available trees'));
        } else if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        }
      }
      process.exit(1);
    }
  });

// Add subcommands to main tree command
treeCommand.addCommand(listCommand);
treeCommand.addCommand(createCommand);
treeCommand.addCommand(switchCommand);
treeCommand.addCommand(currentCommand);
treeCommand.addCommand(deleteCommand);

// Make list the default action
treeCommand.action(async (options) => {
  await listCommand.parseAsync(['list'], { from: 'user' });
});

/**
 * Filter tree nodes to only include nodes with specified IDs and their ancestors/descendants
 */
function filterTreeNodes(roots: any[], targetIds: string[], nodeMap: Map<string, any>): any[] {
  if (targetIds.length === 0) return [];
  
  const targetSet = new Set(targetIds);
  
  function shouldIncludeNode(node: any): boolean {
    // Include if this node is a target
    if (targetSet.has(node.nodeId)) return true;
    
    // Include if any descendant is a target
    return node.children.some((child: any) => shouldIncludeNode(child));
  }
  
  function filterNode(node: any): any | null {
    const shouldInclude = shouldIncludeNode(node);
    if (!shouldInclude) return null;
    
    return {
      ...node,
      children: node.children
        .map((child: any) => filterNode(child))
        .filter((child: any) => child !== null)
    };
  }
  
  return roots
    .map(root => filterNode(root))
    .filter(root => root !== null);
}