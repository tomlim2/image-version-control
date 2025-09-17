import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ImageVersionControl } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';

export const initCommand = new Command('init')
  .description('Initialize a new Pixtree project')
  .option('-n, --name <name>', 'project name')
  .option('--nano-banana-key <key>', 'Nano Banana (Google Gemini) API key')
  .option('--skip-prompts', 'skip interactive prompts and use defaults')
  .action(async (options) => {
    try {
      const projectPath = getProjectPath(options);
      const ivc = new ImageVersionControl(projectPath);
      
      console.log(chalk.cyan('🌳 Initializing Pixtree project...'));
      console.log('');
      
      let projectName = options.name;
      let nanoBananaKey = options.nanoBananaKey;
      
      // Interactive prompts if not skipping
      if (!options.skipPrompts) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'projectName',
            message: 'What\'s your project name?',
            default: projectName || 'My Pixtree Project',
            when: !projectName
          },
          {
            type: 'input',
            name: 'nanoBananaKey',
            message: 'Enter your Google Gemini API key (for Nano Banana):',
            validate: (input: string) => {
              if (!input.trim()) {
                return 'API key is required. Get one at https://ai.google.dev/';
              }
              return true;
            },
            when: !nanoBananaKey
          },
          {
            type: 'confirm',
            name: 'confirmApiKey',
            message: 'Save API key for this project?',
            default: true,
            when: (answers) => answers.nanoBananaKey || nanoBananaKey
          }
        ]);
        
        projectName = answers.projectName || projectName;
        nanoBananaKey = answers.nanoBananaKey || nanoBananaKey;
      }
      
      // Default values if still not provided
      projectName = projectName || 'My Pixtree Project';
      
      if (!nanoBananaKey) {
        console.log(chalk.yellow('⚠️  No API key provided. You can set it later with:'));
        console.log(chalk.cyan('   pixtree config set apiKey <your-key>'));
        console.log('');
      }
      
      // Initialize project
      await ivc.init({
        name: projectName,
        aiProviders: {
          'nano-banana': {
            enabled: true,
            apiKey: nanoBananaKey || '',
            defaultConfig: {
              temperature: 1.0,
              model: 'gemini-2.5-flash-image-preview'
            }
          }
        }
      });
      
      // Success message
      console.log(chalk.green('✅ Project initialized successfully!'));
      console.log('');
      console.log(chalk.yellow('📁 Project structure created:'));
      console.log('   .pixtree/          # Project data (don\'t delete!)');
      console.log('   .pixtree/images/   # Generated images');
      console.log('   .pixtree/nodes/    # Image metadata');
      console.log('   .pixtree/config.json # Project config');
      console.log('');
      
      if (nanoBananaKey) {
        console.log(chalk.yellow('🎯 Next steps:'));
        console.log(`   ${chalk.cyan('pixtree generate "a cute cat"')}     # Generate your first image`);
        console.log(`   ${chalk.cyan('pixtree tree')}                      # View project tree`);
      } else {
        console.log(chalk.yellow('🎯 Next steps:'));
        console.log(`   ${chalk.cyan('pixtree config set apiKey <key>')}   # Set your API key`);
        console.log(`   ${chalk.cyan('pixtree generate "a cute cat"')}     # Generate your first image`);
      }
      
      console.log('');
      console.log(chalk.gray('💡 Get your Gemini API key at: https://ai.google.dev/'));
      console.log(chalk.gray('📚 Documentation: https://pixtree.dev/docs'));
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('already initialized')) {
        console.log(chalk.yellow('⚠️  Project is already initialized'));
        console.log(chalk.gray('   Use'), chalk.cyan('pixtree tree'), chalk.gray('to see your current project'));
      } else {
        throw error;
      }
    }
  });