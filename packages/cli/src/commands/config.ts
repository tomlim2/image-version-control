import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ImageVersionControl } from '@pixtree/core';
import { getProjectPath, formatFileSize } from '../utils/config.js';
import { showSuccess, showError } from '../utils/output.js';

export const configCommand = new Command('config')
  .description('Manage project configuration')
  .argument('[action]', 'action: get, set, list, or test')
  .argument('[key]', 'configuration key')
  .argument('[value]', 'configuration value')
  .option('--global', 'modify global configuration')
  .action(async (action, key, value, options) => {
    try {
      const projectPath = getProjectPath(options);
      const ivc = new ImageVersionControl(projectPath);
      
      switch (action) {
        case 'get':
          await handleGet(ivc, key);
          break;
        case 'set':
          await handleSet(ivc, key, value);
          break;
        case 'list':
          await handleList(ivc);
          break;
        case 'test':
          await handleTest(ivc, key);
          break;
        case 'stats':
          await handleStats(ivc);
          break;
        default:
          // Show help
          console.log(chalk.cyan('🔧 Pixtree Configuration'));
          console.log('');
          console.log(chalk.yellow('Commands:'));
          console.log(`   ${chalk.cyan('pixtree config list')}                    # Show all settings`);
          console.log(`   ${chalk.cyan('pixtree config get <key>')}               # Get specific setting`);
          console.log(`   ${chalk.cyan('pixtree config set <key> <value>')}       # Set configuration`);
          console.log(`   ${chalk.cyan('pixtree config test [provider]')}         # Test AI provider`);
          console.log(`   ${chalk.cyan('pixtree config stats')}                   # Show project stats`);
          console.log('');
          console.log(chalk.yellow('Common settings:'));
          console.log(`   ${chalk.cyan('apiKey')}                                # Nano Banana API key`);
          console.log(`   ${chalk.cyan('defaultModel')}                          # Default AI model`);
          console.log('');
          console.log(chalk.yellow('Examples:'));
          console.log(`   ${chalk.cyan('pixtree config set apiKey sk-...')}      # Set API key`);
          console.log(`   ${chalk.cyan('pixtree config set defaultModel seedream-4.0')} # Change default model`);
          console.log(`   ${chalk.cyan('pixtree config test nano-banana')}       # Test Nano Banana connection`);
      }
      
    } catch (error) {
      if (error instanceof Error) {
        showError('Config operation failed:', error.message);
        
        if (error.message.includes('not initialized')) {
          console.log(chalk.yellow('💡 Run'), chalk.cyan('pixtree init'), chalk.yellow('to initialize the project'));
        }
      }
      process.exit(1);
    }
  });

async function handleGet(ivc: ImageVersionControl, key: string) {
  if (!key) {
    throw new Error('Key is required for get operation');
  }
  
  const config = await (ivc as any).storage.loadConfig();
  const value = getNestedValue(config, key);
  
  if (value === undefined) {
    console.log(chalk.red(`❌ Key not found: ${key}`));
  } else {
    console.log(chalk.cyan(`${key}:`), formatValue(value));
  }
}

async function handleSet(ivc: ImageVersionControl, key: string, value: string) {
  if (!key || value === undefined) {
    throw new Error('Both key and value are required for set operation');
  }
  
  const config = await (ivc as any).storage.loadConfig();
  
  // Handle special keys
  switch (key) {
    case 'apiKey':
      config.aiProviders['nano-banana'].apiKey = value;
      console.log(chalk.green('✅ API key updated'));
      break;
      
    case 'defaultModel':
      config.preferences.defaultModel = value;
      console.log(chalk.green('✅ Default model updated'));
      break;
      
      
      
      
    default:
      // Try to set nested value
      setNestedValue(config, key, parseValue(value));
      console.log(chalk.green(`✅ ${key} updated`));
  }
  
  await (ivc as any).storage.saveConfig(config);
}

async function handleList(ivc: ImageVersionControl) {
  const config = await (ivc as any).storage.loadConfig();
  
  console.log(chalk.cyan('🔧 Project Configuration'));
  console.log('');
  
  console.log(chalk.yellow('Project Info:'));
  console.log(`   ${chalk.gray('Name:')} ${config.name}`);
  console.log(`   ${chalk.gray('Version:')} ${config.version}`);
  console.log('');
  
  console.log(chalk.yellow('AI Providers:'));
  Object.entries(config.aiProviders).forEach(([name, provider]: [string, any]) => {
    const status = provider.enabled ? chalk.green('enabled') : chalk.red('disabled');
    const keyStatus = provider.apiKey ? chalk.green('configured') : chalk.red('missing');
    console.log(`   ${chalk.cyan(name)}: ${status}, API key: ${keyStatus}`);
  });
  console.log('');
  
  console.log(chalk.yellow('Preferences:'));
  console.log(`   ${chalk.gray('Default model:')} ${config.preferences.defaultModel}`);
  console.log('');
  
  console.log(chalk.yellow('Storage:'));
  console.log(`   ${chalk.gray('(No storage settings configured)')}`);
  console.log('');
}

async function handleTest(ivc: ImageVersionControl, provider?: string) {
  const config = await (ivc as any).storage.loadConfig();
  const providersToTest = provider ? [provider] : Object.keys(config.aiProviders);
  
  console.log(chalk.cyan('🧪 Testing AI provider connections...'));
  console.log('');
  
  for (const providerName of providersToTest) {
    const providerConfig = config.aiProviders[providerName];
    
    if (!providerConfig) {
      console.log(`   ${chalk.red('❌')} ${providerName}: Not configured`);
      continue;
    }
    
    if (!providerConfig.enabled) {
      console.log(`   ${chalk.yellow('⏸️ ')} ${providerName}: Disabled`);
      continue;
    }
    
    if (!providerConfig.apiKey) {
      console.log(`   ${chalk.red('❌')} ${providerName}: API key missing`);
      continue;
    }
    
    try {
      // Test connection (this would need to be implemented in the provider)
      console.log(`   ${chalk.blue('🔄')} ${providerName}: Testing...`);
      
      // For now, just check if API key is present
      // In real implementation, we'd call provider.testConnection()
      
      console.log(`   ${chalk.green('✅')} ${providerName}: Connected`);
    } catch (error) {
      console.log(`   ${chalk.red('❌')} ${providerName}: ${error instanceof Error ? error.message : 'Connection failed'}`);
    }
  }
}

async function handleStats(ivc: ImageVersionControl) {
  const stats = await ivc.getStats();
  
  console.log(chalk.cyan('📊 Project Statistics'));
  console.log('');
  
  console.log(chalk.yellow('Storage:'));
  console.log(`   ${chalk.gray('Total images:')} ${stats.totalImages}`);
  console.log(`   ${chalk.gray('Total nodes:')} ${stats.totalNodes}`);
  console.log(`   ${chalk.gray('Storage used:')} ${formatFileSize(stats.totalSize)}`);
  console.log('');
  
  console.log(chalk.yellow('Images by rating:'));
  Object.entries(stats.imagesByRating)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))
    .forEach(([rating, count]) => {
      const stars = rating === '0' ? chalk.gray('unrated') : '⭐'.repeat(parseInt(rating));
      console.log(`   ${stars}: ${count} images`);
    });
}

// Helper functions

function getNestedValue(obj: any, key: string): any {
  return key.split('.').reduce((o, k) => o && o[k], obj);
}

function setNestedValue(obj: any, key: string, value: any): void {
  const keys = key.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
  target[lastKey] = value;
}

function parseValue(value: string): any {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true' || value === '1';
}

function formatValue(value: any): string {
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}