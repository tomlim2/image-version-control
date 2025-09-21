import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Pixtree, TreeNameGenerator } from '@pixtree/core';
import { getProjectPath } from '../utils/config.js';
import { showSuccess, showError, formatNodeInfo } from '../utils/output.js';
import path from 'path';
import fs from 'fs';

export const importCommand = new Command('import')
  .aliases(['imp', 'i'])
  .description('Import an image from file system and create a new tree')
  .argument('<imagePath>', 'path to image file to import')
  .option('--description <description>', 'description for the imported image')
  .option('--tags <tags>', 'comma-separated tags to add to the image')
  .option('-r, --rating <rating>', 'initial rating (1-5)')
  .option('--new-tree', 'explicitly indicate creating a new tree (always true, for clarity)')
  .option('--name <name>', 'name for the new tree (default: auto-generated)')
  .option('--tree-description <description>', 'description for the new tree')
  .option('--tree-tags <tags>', 'comma-separated tags for the new tree')
  .action(async (imagePath, options) => {
    try {
      const projectPath = getProjectPath(options);
      const pixtree = new Pixtree(projectPath);
      
      // Validate image path
      const resolvedPath = path.resolve(imagePath);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
      
      // Check if it's a file
      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${imagePath}`);
      }
      
      // Validate file extension
      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
      const ext = path.extname(resolvedPath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        throw new Error(`Unsupported image format: ${ext}. Supported formats: ${allowedExtensions.join(', ')}`);
      }
      
      const rating = options.rating ? parseInt(options.rating) : undefined;
      if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }
      
      // Parse tags
      const tags = options.tags 
        ? options.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [];
        
      const treeTags = options.treeTags 
        ? options.treeTags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : ['imported'];
      
      // Generate tree name with uniqueness check
      let treeName: string;
      if (options.name) {
        // User provided name - check for uniqueness
        const existingTrees = await pixtree.getTrees();
        const existingNames = existingTrees.map(tree => tree.name);
        
        if (existingNames.includes(options.name)) {
          // Append number to make it unique
          let counter = 1;
          do {
            treeName = `${options.name} ${counter}`;
            counter++;
          } while (existingNames.includes(treeName));
          
          console.log(chalk.yellow(`⚠️  Tree name "${options.name}" already exists. Using "${treeName}" instead.`));
        } else {
          treeName = options.name;
        }
      } else {
        // Auto-generate unique tree name
        const existingTrees = await pixtree.getTrees();
        const existingNames = existingTrees.map(tree => tree.name);
        const generator = TreeNameGenerator.getInstance();
        
        treeName = generator.generateName({
          existingNames
        });
      }
      
      // Show import info
      console.log(chalk.cyan('📥 Importing image and creating new tree...'));
      console.log(`📁 ${chalk.yellow('File:')} ${resolvedPath}`);
      console.log(`🌳 ${chalk.blue('New Tree:')} ${treeName}`);
      if (tags.length > 0) {
        console.log(`🏷️  ${chalk.green('Image Tags:')} ${tags.join(', ')}`);
      }
      if (treeTags.length > 0) {
        console.log(`🏷️  ${chalk.blue('Tree Tags:')} ${treeTags.join(', ')}`);
      }
      console.log('');
      
      // Start spinner
      const spinner = ora({
        text: 'Reading image file and creating tree...',
        color: 'cyan'
      }).start();
      
      try {
        // Import image - always create new tree, don't auto-checkout unless requested
        const importedNode = await pixtree.import(resolvedPath, {
          treeId: undefined, // Force new tree creation
          treeName,
          description: options.description,
          tags,
          treeTags,
          treeDescription: options.treeDescription,
          rating,
          importMethod: 'root' // Always create as root in new tree
        });
        
        // Get the created tree info
        const createdTree = await pixtree.getTreeById(importedNode.treeId);
        
        spinner.succeed('Image imported successfully!');
        console.log('');
        
        // Show result
        showSuccess(formatNodeInfo(importedNode));
        console.log('');
        console.log(chalk.blue('🌳 New tree created:'), chalk.yellow(createdTree.name));
        console.log(chalk.gray('📍 Tree ID:'), chalk.gray(createdTree.id));
        console.log(chalk.gray('📷 Node ID:'), chalk.gray(importedNode.id));
        
        // Show checkout instruction
        console.log('');
        console.log(chalk.yellow('💡 Image imported successfully! Current working node is now'), chalk.cyan(importedNode.id));
        console.log(chalk.yellow('   To start working with this image, run:'), chalk.cyan(`pixtree checkout ${importedNode.id}`));
        
        console.log('');
        console.log(chalk.yellow('📋 Next steps:'));
        console.log(`   ${chalk.cyan('pixtree tree')}                           # View project tree structure`);
        console.log(`   ${chalk.cyan(`pixtree checkout ${importedNode.id}`)}    # Checkout to this image`);
        console.log(`   ${chalk.cyan(`pixtree node ${importedNode.id} tag add <tag>`)}  # Add more tags`);
        console.log(`   ${chalk.cyan('pixtree generate "variation"')}           # Generate variation from this image`);
        console.log(`   ${chalk.cyan(`pixtree export ${importedNode.id}`)}          # Export image`);
        
      } catch (error) {
        spinner.fail('Import failed');
        throw error;
      }
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Import failed:', error.message);
        
        // Show helpful hints
        if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        } else if (error.message.includes('No tree selected')) {
          console.log(chalk.yellow('💡 Create and switch to a tree first:'));
          console.log(`   ${chalk.cyan('pixtree tree create "my-project"')}`);
          console.log(`   ${chalk.cyan('pixtree tree switch "my-project"')}`);
        } else if (error.message.includes('already contains')) {
          console.log(chalk.yellow('💡 Create a new empty tree for imports:'));
          console.log(`   ${chalk.cyan('pixtree tree create "my-imports"')}`);
          console.log(`   ${chalk.cyan('pixtree tree switch "my-imports"')}`);
          console.log(`   ${chalk.cyan('pixtree import <image-path>')}`);
        } else if (error.message.includes('not found')) {
          console.log(chalk.yellow('💡 Check the file path and try again'));
        } else if (error.message.includes('Unsupported')) {
          console.log(chalk.yellow('💡 Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP'));
        } else if (error.message.includes('ImportOptions')) {
          console.log(chalk.yellow('💡 Try using simpler options or check the core API'));
        }
      }
      process.exit(1);
    }
  });