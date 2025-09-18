import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { showSuccess, showError, formatNodeInfo } from '../utils/output.js';

export const generateCommand = new Command('generate')
  .aliases(['gen', 'g'])
  .description('Generate a new image from text prompt')
  .argument('<prompt>', 'text prompt for image generation')
  .option('-m, --model <model>', 'AI model to use', 'nano-banana')
  .option('-p, --parent <nodeId>', 'parent node ID (default: current node)')
  .option('-t, --temperature <number>', 'creativity level (0-2)', '1.0')
  .option('--negative <prompt>', 'negative prompt')
  .option('--steps <number>', 'generation steps', '50')
  .option('--guidance <number>', 'guidance scale', '7.5')
  .option('--tags <tags>', 'comma-separated tags to add')
  .option('-r, --rating <rating>', 'initial rating (1-5)')
  .option('--no-current', 'don\'t set as current node after generation')
  .action(async (prompt, options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      // Validate inputs
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Prompt cannot be empty');
      }
      
      if (prompt.length > 1000) {
        throw new Error('Prompt too long (max 1000 characters)');
      }
      
      const temperature = parseFloat(options.temperature);
      if (isNaN(temperature) || temperature < 0 || temperature > 2) {
        throw new Error('Temperature must be between 0 and 2');
      }
      
      const rating = options.rating ? parseInt(options.rating) : undefined;
      if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }
      
      // Parse tags
      const tags = options.tags 
        ? options.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [];
      
      // Show generation info
      console.log(chalk.cyan('🎨 Generating image...'));
      console.log(`📝 ${chalk.yellow('Prompt:')} "${prompt}"`);
      console.log(`🤖 ${chalk.blue('Model:')} ${options.model}`);
      if (tags.length > 0) {
        console.log(`🏷️  ${chalk.green('Tags:')} ${tags.join(', ')}`);
      }
      console.log('');
      
      // Start spinner
      const spinner = ora({
        text: 'Calling AI model... This may take 10-30 seconds',
        color: 'cyan'
      }).start();
      
      try {
        // Generate image
        const node = await pixtree.generate(prompt, {
          model: options.model,
          parentId: options.parent,
          modelConfig: {
            temperature,
            negativePrompt: options.negative,
            steps: parseInt(options.steps),
            guidance: parseFloat(options.guidance)
          },
          tags,
          rating
        });
        
        spinner.succeed('Image generated successfully!');
        console.log('');
        
        // Show result
        showSuccess(formatNodeInfo(node));
        
        console.log('');
        console.log(chalk.yellow('💡 Next steps:'));
        console.log(`   ${chalk.cyan('pixtree tree')}                    # View project tree`);
        console.log(`   ${chalk.cyan('pixtree tag ' + node.id + ' <tag>')}    # Add tags`);
        console.log(`   ${chalk.cyan('pixtree generate "variation"')}    # Generate variation`);
        console.log(`   ${chalk.cyan('pixtree export ' + node.id)}       # Export image`);
        
      } catch (error) {
        spinner.fail('Generation failed');
        throw error;
      }
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Generation failed:', error.message);
        
        // Show helpful hints
        if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        } else if (error.message.includes('API key')) {
          console.log(chalk.yellow('💡 Set your API key:'), chalk.cyan('pixtree config set apiKey <your-key>'));
        } else if (error.message.includes('Provider')) {
          console.log(chalk.yellow('💡 Available models: nano-banana, seedream-4.0'));
        }
      }
      process.exit(1);
    }
  });