import { Command } from 'commander';
import chalk from 'chalk';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { showSuccess, showError, formatNodeInfo } from '../utils/output.js';

export const checkoutCommand = new Command('checkout')
  .aliases(['co'])
  .description('Switch to a specific node')
  .argument('<nodeId>', 'node ID to switch to')
  .action(async (nodeId, options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      // Checkout node
      const node = await pixtree.checkout(nodeId);
      
      console.log(chalk.green('✅ Switched to node:'), chalk.cyan(nodeId));
      console.log('');
      
      // Show node details
      showSuccess(formatNodeInfo(node));
      
      console.log('');
      console.log(chalk.yellow('💡 From here you can:'));
      console.log(`   ${chalk.cyan('pixtree generate "new prompt"')}    # Create child from this node`);
      console.log(`   ${chalk.cyan('pixtree tree')}                     # View tree with current position`);
      console.log(`   ${chalk.cyan('pixtree export ' + nodeId)}         # Export this image`);
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Checkout failed:', error.message);
        
        if (error.message.includes('not found')) {
          console.log(chalk.yellow('💡 Use'), chalk.cyan('pixtree tree'), chalk.yellow('to see available nodes'));
        } else if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        }
      }
      process.exit(1);
    }
  });