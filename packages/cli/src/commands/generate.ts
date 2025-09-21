import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Pixtree } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { showSuccess, showError, formatNodeInfo } from '../utils/output.js';

export const generateCommand = new Command('generate')
  .aliases(['gen', 'g'])
  .description('Generate a new image from text prompt with model-specific parameters')
  .argument('<prompt>', 'text prompt for image generation')
  .option('-m, --model <model>', 'AI model to use', 'nano-banana')
  .option('-p, --parent <nodeId>', 'parent node ID (default: current node)')
  .option('-t, --temperature <number>', 'creativity level (0-1 for nano-banana, 0-2 for diffusion)', '0.7')
  .option('--top-p <number>', 'nucleus sampling threshold (nano-banana only)', '0.95')
  .option('--top-k <number>', 'top-k sampling (nano-banana only)', '40')
  .option('--aspect-ratio <ratio>', 'image aspect ratio (1:1, 16:9, 9:16)', '1:1')
  .option('--negative <prompt>', 'negative prompt (diffusion models only)')
  .option('--steps <number>', 'generation steps (diffusion models only)', '50')
  .option('--cfg-scale <number>', 'classifier-free guidance scale (diffusion models only)', '7.5')
  .option('--reference-images <paths>', 'comma-separated reference image paths (nano-banana: up to 5, seedream: up to 3)')
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
      
      // Get selected model for validation
      const selectedModel = options.model;
      
      // Validate temperature based on model
      const temperature = parseFloat(options.temperature);
      if (selectedModel === 'nano-banana') {
        if (isNaN(temperature) || temperature < 0 || temperature > 1) {
          throw new Error('Temperature must be between 0 and 1 for nano-banana');
        }
      } else {
        if (isNaN(temperature) || temperature < 0 || temperature > 2) {
          throw new Error('Temperature must be between 0 and 2 for diffusion models');
        }
      }
      
      // Parse and validate reference images
      let referenceImages: string[] = [];
      if (options.referenceImages) {
        referenceImages = options.referenceImages
          .split(',')
          .map((path: string) => path.trim())
          .filter(Boolean);
        
        // Validate file existence and format
        const fs = await import('fs-extra');
        const path = await import('path');
        
        for (const imagePath of referenceImages) {
          if (!(await fs.pathExists(imagePath))) {
            throw new Error(`Reference image not found: ${imagePath}`);
          }
          
          const ext = path.extname(imagePath).toLowerCase();
          if (!['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
            throw new Error(`Unsupported image format: ${imagePath}`);
          }
        }
      }
      
      // Model-specific parameter validation with default values
      let steps, cfgScale, topP, topK;
      
      if (selectedModel === 'nano-banana') {
        // Nano Banana specific validations - always apply defaults
        topP = parseFloat(options.topP || '0.95');
        if (isNaN(topP) || topP < 0 || topP > 1) {
          throw new Error('Top-P must be between 0 and 1');
        }
        
        topK = parseInt(options.topK || '40');
        if (isNaN(topK) || topK < 1 || topK > 100) {
          throw new Error('Top-K must be between 1 and 100');
        }
        
        // Validate reference images for nano-banana (up to 5)
        if (referenceImages.length > 5) {
          throw new Error('Nano Banana supports up to 5 reference images');
        }
        
        // Warn about unsupported options
        if (options.steps) console.log(chalk.yellow('⚠️  Warning: --steps ignored for nano-banana model'));
        if (options.cfgScale) console.log(chalk.yellow('⚠️  Warning: --cfg-scale ignored for nano-banana model'));
        if (options.negative) console.log(chalk.yellow('⚠️  Warning: --negative ignored for nano-banana model'));
        
      } else {
        // Diffusion model validations - always apply defaults
        steps = parseInt(options.steps || '50');
        if (isNaN(steps) || steps < 1 || steps > 100) {
          throw new Error('Steps must be between 1 and 100');
        }
        
        cfgScale = parseFloat(options.cfgScale || '7.5');
        if (isNaN(cfgScale) || cfgScale < 1 || cfgScale > 20) {
          throw new Error('CFG scale must be between 1 and 20');
        }
        
        // Validate reference images for diffusion models (up to 3)
        if (referenceImages.length > 3) {
          throw new Error('Seedream supports up to 3 reference images');
        }
        
        // Warn about unsupported options
        if (options.topP) console.log(chalk.yellow('⚠️  Warning: --top-p ignored for diffusion models'));
        if (options.topK) console.log(chalk.yellow('⚠️  Warning: --top-k ignored for diffusion models'));
      }
      
      // Pre-validation: Check API key and model configuration
      const config = await (pixtree as any).storage.loadConfig();
      
      if (!config.aiProviders[selectedModel]) {
        throw new Error(`Model '${selectedModel}' is not configured`);
      }
      
      const modelConfig = config.aiProviders[selectedModel];
      if (!modelConfig.enabled) {
        throw new Error(`Model '${selectedModel}' is disabled`);
      }
      
      if (!modelConfig.apiKey || modelConfig.apiKey.trim() === '') {
        throw new Error(`API key not set for model '${selectedModel}'`);
      }
      
      // Build model-specific configuration
      const dynamicModelConfig: Record<string, any> = {
        prompt // Always include prompt
      };
      
      // Map CLI options to model-specific config based on selected model
      if (selectedModel === 'nano-banana') {
        // Nano Banana (Google Gemini) parameters - always include defaults
        dynamicModelConfig.temperature = temperature;
        dynamicModelConfig.topP = topP;
        dynamicModelConfig.topK = topK;
        dynamicModelConfig.aspectRatio = options.aspectRatio || '1:1';
        if (referenceImages.length > 0) {
          dynamicModelConfig.referenceImages = referenceImages;
        }
      } else if (selectedModel === 'seedream-4.0') {
        // Seedream parameters - always include defaults
        dynamicModelConfig.cfgScale = cfgScale;
        dynamicModelConfig.steps = steps;
        dynamicModelConfig.aspectRatio = options.aspectRatio || '1:1';
        if (options.negative) dynamicModelConfig.negativePrompt = options.negative;
        if (referenceImages.length > 0) {
          dynamicModelConfig.referenceImages = referenceImages;
        }
      } else {
        // Fallback: use generic parameter mapping for unknown models
        dynamicModelConfig.temperature = temperature;
        dynamicModelConfig.steps = steps;
        dynamicModelConfig.cfgScale = cfgScale;
        dynamicModelConfig.aspectRatio = options.aspectRatio || '1:1';
        if (options.negative) dynamicModelConfig.negativePrompt = options.negative;
        if (referenceImages.length > 0) {
          dynamicModelConfig.referenceImages = referenceImages;
        }
      }
      
      // Check if current image context will be used
      const currentContext = await (pixtree as any).storage.getCurrentNode();
      
      // Show generation info
      console.log(chalk.cyan('🎨 Generating image...'));
      console.log(`📝 ${chalk.yellow('Prompt:')} "${prompt}"`);
      console.log(`🤖 ${chalk.blue('Model:')} ${options.model}`);
      
      // Show current image context if exists
      if (currentContext) {
        console.log(`🔗 ${chalk.magenta('Using current image as reference:')} ${currentContext.id}`);
        console.log(`   ${chalk.dim(currentContext.imagePath)}`);
      }
      
      // Show additional reference images
      if (referenceImages.length > 0) {
        console.log(`🖼️  ${chalk.green('Additional reference images:')} ${referenceImages.length} file(s)`);
        referenceImages.forEach((img, idx) => {
          console.log(`   ${idx + 1}. ${chalk.dim(img)}`);
        });
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
          modelConfig: dynamicModelConfig
        });
        
        spinner.succeed('Image generated successfully!');
        console.log('');
        
        // Show result
        showSuccess(formatNodeInfo(node));
        
        console.log('');
        console.log(chalk.yellow('💡 Next steps:'));
        console.log(`   ${chalk.cyan('pixtree tree')}                    # View project tree`);
        console.log(`   ${chalk.cyan('pixtree tag ' + node.id + ' <tag>')}    # Add tags`);
        console.log(`   ${chalk.cyan('pixtree export ' + node.id)}       # Export image`);
        console.log('');
        console.log(chalk.yellow('🎨 Generate more with model-specific options:'));
        
        if (selectedModel === 'nano-banana') {
          console.log(`   ${chalk.cyan('pixtree generate "portrait" --temperature 0.8 --top-p 0.9')}`);
          console.log(`   ${chalk.cyan('pixtree generate "landscape" --aspect-ratio 16:9 --top-k 30')}`);
          console.log(`   ${chalk.cyan('pixtree generate "style transfer" --reference-images ref1.jpg,ref2.png')}`);
        } else {
          console.log(`   ${chalk.cyan('pixtree generate "variation" --steps 75 --cfg-scale 8.5')}`);
          console.log(`   ${chalk.cyan('pixtree generate "improved" --negative "blurry, low quality"')}`);
          console.log(`   ${chalk.cyan('pixtree generate "style mix" --reference-images style.jpg,ref.png')}`);
        }
        
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
        } else if (error.message.includes('No tree selected')) {
          console.log(chalk.yellow('💡 Create and switch to a tree first:'));
          console.log(`   ${chalk.cyan('pixtree tree create "my-project"')}`);
          console.log(`   ${chalk.cyan('pixtree tree switch "my-project"')}`);
        } else if (error.message.includes('API key')) {
          console.log(chalk.yellow('💡 Set your API key:'), chalk.cyan('pixtree config set apiKey <your-key>'));
        } else if (error.message.includes('Provider') || error.message.includes('not configured')) {
          try {
            const projectPath = getProjectPath(options);
            const tempPixtree = new Pixtree(projectPath);
            const config = await (tempPixtree as any).storage.loadConfig();
            const availableModels = Object.keys(config.aiProviders).filter(
              model => config.aiProviders[model].enabled
            );
            console.log(chalk.yellow('💡 Available models:'), availableModels.join(', '));
          } catch {
            console.log(chalk.yellow('💡 Available models: nano-banana, seedream-4.0'));
          }
        }
      }
      process.exit(1);
    }
  });