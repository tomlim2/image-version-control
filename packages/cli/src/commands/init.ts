import { Command } from 'commander';
import chalk from 'chalk';
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
      const currentDirName = require('path').basename(process.cwd());
      const projectName = currentDirName || 'main';
      
      // Initialize project with minimal settings
      await pixtree.init({
        name: projectName,
        aiProviders: {
          'nano-banana': {
            enabled: true,
            apiKey: '', // Empty - user sets later
            defaultConfig: {
              temperature: 1.0,
              model: 'gemini-2.5-flash-image-preview'
            }
          }
        }
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
      console.log(`   ${chalk.cyan('pixtree import image.jpg')}                # 2. Import your first image`);
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