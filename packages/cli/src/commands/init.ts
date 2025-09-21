import { Command } from 'commander';
import chalk from 'chalk';
import { basename } from 'path';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';

export const initCommand = new Command('init')
  .description('Initialize a new Pixtree project')
  .action(async (options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      console.log(chalk.cyan('🌳 Initializing Pixtree project...'));
      console.log('');
      
      // Use current directory name or default to "main"
      const currentDirName = basename(process.cwd());
      const projectName = currentDirName || 'main';
      
      // Initialize project with minimal settings
      await pixtree.init({
        name: projectName
      });
      
      // Success message
      console.log(chalk.green('✅ Pixtree project initialized!'));
      console.log('');
      console.log(chalk.yellow('📁 Project structure:'));
      console.log('   .pixtree/          # Project data');
      console.log('   .pixtree/images/   # Generated images');
      console.log('   .pixtree/nodes/    # Image metadata');
      console.log('');
      
      console.log(chalk.yellow('🎯 Get started:'));
      console.log(`   ${chalk.cyan('pixtree config set apiKey <your-key>')}    # 1. Set API key first`);
      console.log(`   ${chalk.cyan('pixtree tree create "my-project"')}        # 2. Create your first tree`);
      console.log(`   ${chalk.cyan('pixtree tree switch "my-project"')}        # 3. Switch to the tree`);
      console.log(`   ${chalk.cyan('pixtree generate "cute cat"')}             # 4. Generate or import images`);
      console.log('');
      console.log(chalk.gray('💡 Get API key: https://ai.google.dev/'));
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('already initialized')) {
        console.log(chalk.yellow('⚠️  Project is already initialized'));
        console.log(chalk.gray('   Use'), chalk.cyan('pixtree tree'), chalk.gray('to see your current project'));
      } else {
        throw error;
      }
    }
  });