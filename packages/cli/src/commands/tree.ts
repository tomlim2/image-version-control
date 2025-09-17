import { Command } from 'commander';
import chalk from 'chalk';
import { ImageVersionControl } from '@pixtree/core';
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
  .action(async (options) => {
    try {
      const projectPath = getProjectPath(options);
      const ivc = new ImageVersionControl(projectPath);
      
      // Get current node
      const currentNode = await ivc.getCurrentNode();
      
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
      
      // Get filtered nodes or all nodes
      let nodes;
      if (Object.keys(searchQuery).length > 0 || options.favorites || options.generated || options.imported || options.failed) {
        // Apply additional filters
        nodes = await ivc.search(searchQuery);
        
        if (options.favorites) {
          nodes = nodes.filter(node => node.userMetadata.favorite);
        }
        
        if (options.generated) {
          nodes = nodes.filter(node => node.source === 'generated');
        }
        
        if (options.imported) {
          nodes = nodes.filter(node => node.source === 'imported');
        }
        
        if (options.failed) {
          nodes = nodes.filter(node => !node.success);
        }
        
        // Convert to tree structure
        const allRoots = await ivc.getTree();
        const filteredRoots = filterTreeNodes(allRoots, nodes.map(n => n.id));
        
        // Show filter info
        if (filteredRoots.length !== allRoots.length) {
          console.log(chalk.blue('🔍 Filtered view') + chalk.gray(` (${nodes.length} nodes match criteria)`));
          console.log('');
        }
        
        displayTree(filteredRoots, currentNode?.id);
        
      } else {
        // Show full tree
        const roots = await ivc.getTree();
        displayTree(roots, currentNode?.id);
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