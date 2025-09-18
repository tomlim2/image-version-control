import { Command } from 'commander';
import chalk from 'chalk';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { displayTree, showError } from '../utils/output.js';

export const treeCommand = new Command('tree')
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
        displayTreesOverview(trees, context.currentTree?.id);
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
      await displayProjectTreeStructure(ivc, trees, searchQuery, options, context.currentNode?.id);
      
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
      
      // Show additional info
      if (currentNode) {
        console.log('');
        console.log(chalk.gray('💡 Current node:'), chalk.cyan(currentNode.id));
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

/**
 * Filter tree nodes to only include nodes with specified IDs and their ancestors/descendants
 */
function filterTreeNodes(roots: any[], targetIds: string[]): any[] {
  if (targetIds.length === 0) return [];
  
  const targetSet = new Set(targetIds);
  
  function shouldIncludeNode(node: any): boolean {
    // Include if this node is a target
    if (targetSet.has(node.node.id)) return true;
    
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