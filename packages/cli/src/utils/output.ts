import chalk from 'chalk';
import { ImageNode, TreeNode } from '@pixtree/core';
import { formatFileSize, formatDuration, truncateText } from './config.js';

/**
 * Display success message with optional details
 */
export function showSuccess(messages: string[]): void {
  messages.forEach(message => console.log(message));
}

/**
 * Display error message
 */
export function showError(message: string, details?: string): void {
  console.error(chalk.red('❌'), message);
  if (details) {
    console.error(chalk.gray(details));
  }
}

/**
 * Display warning message
 */
export function showWarning(message: string): void {
  console.warn(chalk.yellow('⚠️ '), message);
}

/**
 * Display info message
 */
export function showInfo(message: string): void {
  console.log(chalk.blue('ℹ️ '), message);
}

/**
 * Format node information for display
 */
export function formatNodeInfo(node: ImageNode): string[] {
  const lines: string[] = [];
  
  // Basic info
  lines.push(`📋 ${chalk.cyan('Node:')} ${node.id}`);
  
  if (node.source === 'generated') {
    lines.push(`🎨 ${chalk.yellow('Prompt:')} "${truncateText(node.generationParams?.prompt || '', 60)}"`);
    lines.push(`🤖 ${chalk.blue('Model:')} ${node.model}`);
    if (node.metadata.generationTime) {
      lines.push(`⏱️  ${chalk.gray('Generation time:')} ${formatDuration(node.metadata.generationTime)}`);
    }
  } else {
    lines.push(`📸 ${chalk.yellow('Imported:')} ${node.importInfo?.originalFilename}`);
    if (node.importInfo?.userDescription) {
      lines.push(`📝 ${chalk.gray('Description:')} ${node.importInfo.userDescription}`);
    }
  }
  
  // User metadata
  if (node.userMetadata.tags.length > 0) {
    const tagColors = [chalk.green, chalk.blue, chalk.magenta, chalk.cyan];
    const coloredTags = node.userMetadata.tags.map((tag, i) => 
      tagColors[i % tagColors.length](tag)
    );
    lines.push(`🏷️  ${chalk.gray('Tags:')} ${coloredTags.join(', ')}`);
  }
  
  if (node.userMetadata.rating) {
    const stars = '⭐'.repeat(node.userMetadata.rating);
    lines.push(`${stars} ${chalk.gray('Rating:')} ${node.userMetadata.rating}/5`);
  }
  
  if (node.userMetadata.favorite) {
    lines.push(`❤️  ${chalk.red('Favorite')}`);
  }
  
  // File info
  lines.push(`📁 ${chalk.gray('Size:')} ${formatFileSize(node.metadata.fileSize)}`);
  lines.push(`📐 ${chalk.gray('Dimensions:')} ${node.metadata.dimensions.width}×${node.metadata.dimensions.height}`);
  lines.push(`📅 ${chalk.gray('Created:')} ${new Date(node.timestamp).toLocaleString()}`);
  
  // Status
  if (!node.success && node.error) {
    lines.push(`❌ ${chalk.red('Error:')} ${node.error}`);
  }
  
  return lines;
}

/**
 * Display tree structure
 */
export function displayTree(roots: TreeNode[], currentNodeId?: string): void {
  if (roots.length === 0) {
    console.log(chalk.gray('📭 No images yet!'));
    console.log(chalk.yellow('💡 Generate your first image with:'), chalk.cyan('pixtree generate "your prompt"'));
    return;
  }
  
  console.log(chalk.cyan('🌳 Project Tree:'));
  console.log('');
  
  roots.forEach((root, index) => {
    displayTreeNode(root, '', index === roots.length - 1, currentNodeId);
  });
}

/**
 * Display a single tree node
 */
function displayTreeNode(
  treeNode: TreeNode, 
  prefix: string, 
  isLast: boolean, 
  currentNodeId?: string
): void {
  const { node, children } = treeNode;
  
  // Node prefix
  const nodePrefix = prefix + (isLast ? '└── ' : '├── ');
  
  // Node icon based on source
  const icon = node.source === 'generated' ? '🖼️ ' : '📸 ';
  
  // Node display text
  let nodeText = '';
  if (node.source === 'generated') {
    nodeText = `"${truncateText(node.generationParams?.prompt || 'Unknown', 40)}"`;
  } else {
    nodeText = node.importInfo?.originalFilename || 'Imported';
  }
  
  // Node ID and model
  const nodeDetails = `(${node.id})`;
  const modelBadge = node.model ? ` [${getModelBadge(node.model)}]` : '';
  
  // Success/failure indicator
  const statusIcon = node.success ? '' : ' ❌';
  
  // Current node indicator
  const currentIndicator = node.id === currentNodeId ? ' ← current' : '';
  
  // Rating stars
  const rating = node.userMetadata.rating ? ' ' + '⭐'.repeat(node.userMetadata.rating) : '';
  
  // Tags preview
  const tagsPreview = node.userMetadata.tags.length > 0 
    ? ` #${node.userMetadata.tags.slice(0, 2).join(' #')}${node.userMetadata.tags.length > 2 ? '...' : ''}`
    : '';
  
  // Compose full line
  const fullLine = `${nodePrefix}${icon}${chalk.white(nodeText)} ${chalk.gray(nodeDetails)}${chalk.blue(modelBadge)}${statusIcon}${rating}${chalk.green(tagsPreview)}${chalk.yellow(currentIndicator)}`;
  
  console.log(fullLine);
  
  // Display children
  const childPrefix = prefix + (isLast ? '    ' : '│   ');
  children.forEach((child, index) => {
    displayTreeNode(child, childPrefix, index === children.length - 1, currentNodeId);
  });
}

/**
 * Get colored model badge
 */
function getModelBadge(model: string): string {
  switch (model) {
    case 'nano-banana':
      return chalk.blue('NB');
    case 'seedream-4.0':
      return chalk.orange('SD');
    default:
      return chalk.gray(model.substring(0, 2).toUpperCase());
  }
}

/**
 * Display node comparison
 */
export function displayComparison(node1: ImageNode, node2: ImageNode, similarity: number): void {
  console.log(chalk.cyan('🔍 Image Comparison'));
  console.log('');
  
  // Similarity score
  const similarityColor = similarity > 0.8 ? chalk.green : similarity > 0.5 ? chalk.yellow : chalk.red;
  console.log(`📊 ${chalk.gray('Similarity:')} ${similarityColor(`${(similarity * 100).toFixed(1)}%`)}`);
  console.log('');
  
  // Side by side comparison
  console.log(chalk.gray('Node 1:'));
  formatNodeInfo(node1).forEach(line => console.log('  ' + line));
  
  console.log('');
  console.log(chalk.gray('Node 2:'));
  formatNodeInfo(node2).forEach(line => console.log('  ' + line));
}

/**
 * Display search results
 */
export function displaySearchResults(nodes: ImageNode[], query: any): void {
  console.log(chalk.cyan(`🔍 Search Results (${nodes.length} found)`));
  console.log('');
  
  if (nodes.length === 0) {
    console.log(chalk.gray('No nodes found matching your criteria'));
    return;
  }
  
  nodes.forEach((node, index) => {
    const prefix = index === nodes.length - 1 ? '└── ' : '├── ';
    const icon = node.source === 'generated' ? '🖼️ ' : '📸 ';
    
    let text = '';
    if (node.source === 'generated') {
      text = `"${truncateText(node.generationParams?.prompt || '', 50)}"`;
    } else {
      text = node.importInfo?.originalFilename || 'Imported';
    }
    
    const rating = node.userMetadata.rating ? ' ' + '⭐'.repeat(node.userMetadata.rating) : '';
    const tags = node.userMetadata.tags.length > 0 ? ` #${node.userMetadata.tags.join(' #')}` : '';
    
    console.log(`${prefix}${icon}${text} ${chalk.gray(`(${node.id})`)}${rating}${chalk.green(tags)}`);
  });
}