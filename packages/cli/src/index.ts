#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import commands
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { treeCommand } from './commands/tree.js';
import { checkoutCommand } from './commands/checkout.js';
import { tagCommand } from './commands/tag.js';
import { exportCommand } from './commands/export.js';
import { configCommand } from './commands/config.js';

// Get package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

// Configure main program
program
  .name('pixtree')
  .description('🌳 Pixtree - AI image version control system')
  .version(packageJson.version)
  .option('-v, --verbose', 'enable verbose logging')
  .option('--project-path <path>', 'specify project path (default: current directory)');

// Add commands
program.addCommand(initCommand);
program.addCommand(generateCommand);
program.addCommand(treeCommand);
program.addCommand(checkoutCommand);
program.addCommand(tagCommand);
program.addCommand(exportCommand);
program.addCommand(configCommand);

// Global error handling
program.exitOverride();

// Custom help
program.on('--help', () => {
  console.log('');
  console.log(chalk.yellow('Examples:'));
  console.log('  $ pixtree init                           Initialize new project');
  console.log('  $ pixtree generate "a cute cat"         Generate image from prompt');
  console.log('  $ pixtree tree                          Show project tree');
  console.log('  $ pixtree tag node-123 "favorite"      Add tag to node');
  console.log('  $ pixtree export node-123               Export image');
  console.log('  $ pixtree config set apiKey <key>       Set API key');
  console.log('');
  console.log(chalk.yellow('Get started:'));
  console.log('  1. pixtree init');
  console.log('  2. Set your API key: pixtree config set apiKey <your-key>');
  console.log('  3. pixtree generate "your first prompt"');
  console.log('');
  console.log(chalk.cyan('📚 Documentation: https://pixtree.dev/docs'));
  console.log(chalk.cyan('🐛 Issues: https://github.com/younsoolim/pixtree/issues'));
});

// Parse arguments and run
try {
  await program.parseAsync();
} catch (error) {
  if (error instanceof Error) {
    console.error(chalk.red('❌ Error:'), error.message);
    
    // Show helpful hints for common errors
    if (error.message.includes('not initialized')) {
      console.log(chalk.yellow('💡 Hint: Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize a new project'));
    } else if (error.message.includes('API key')) {
      console.log(chalk.yellow('💡 Hint: Set your API key with'), chalk.cyan('pixtree config set apiKey <your-key>'));
    }
  } else {
    console.error(chalk.red('❌ Unknown error occurred'));
  }
  
  process.exit(1);
}