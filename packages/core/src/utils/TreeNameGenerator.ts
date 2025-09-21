/**
 * Random tree name generator for Pixtree
 * Combines adjectives with tree names to create unique, memorable tree names
 */

const TREE_NAMES = [
  'Oak', 'Pine', 'Maple', 'Birch', 'Cedar', 'Willow', 'Elm', 'Ash',
  'Cherry', 'Apple', 'Magnolia', 'Redwood', 'Sequoia', 'Spruce', 'Fir',
  'Poplar', 'Sycamore', 'Walnut', 'Hickory', 'Beech', 'Chestnut', 'Cypress',
  'Juniper', 'Larch', 'Mahogany', 'Teak', 'Bamboo', 'Palm', 'Eucalyptus',
  'Acacia', 'Olive', 'Fig', 'Peach', 'Plum', 'Pear', 'Lemon', 'Orange',
  'Dogwood', 'Hawthorn', 'Elder', 'Rowan', 'Yew', 'Holly', 'Ivy',
  'Jasmine', 'Lavender', 'Rose', 'Lilac', 'Sage', 'Thyme', 'Mint',
  'Baobab', 'Banyan', 'Mangrove', 'Cottonwood', 'Ironwood', 'Ebony'
];

const ADJECTIVES = [
  'Ancient', 'Majestic', 'Towering', 'Graceful', 'Sturdy', 'Noble', 'Wise',
  'Gentle', 'Strong', 'Vibrant', 'Serene', 'Peaceful', 'Mighty', 'Grand',
  'Elegant', 'Proud', 'Resilient', 'Flourishing', 'Radiant', 'Golden',
  'Silver', 'Crimson', 'Emerald', 'Azure', 'Amber', 'Ruby', 'Sapphire',
  'Mystical', 'Enchanted', 'Sacred', 'Blessed', 'Divine', 'Eternal',
  'Whispering', 'Dancing', 'Swaying', 'Blooming', 'Glowing', 'Shimmering',
  'Twisted', 'Gnarled', 'Bent', 'Crooked', 'Straight', 'Tall', 'Short',
  'Wide', 'Narrow', 'Thick', 'Slender', 'Broad', 'Slim', 'Hefty',
  'Delicate', 'Fragile', 'Robust', 'Hardy', 'Tender', 'Soft', 'Rough',
  'Smooth', 'Glossy', 'Matte', 'Bright', 'Dark', 'Light', 'Deep',
  'Shallow', 'Dense', 'Sparse', 'Full', 'Empty', 'Rich', 'Poor',
  'Young', 'Old', 'New', 'Fresh', 'Aged', 'Weathered', 'Worn',
  'Polished', 'Rustic', 'Wild', 'Tame', 'Free', 'Bound', 'Loose',
  'Brave', 'Bold', 'Shy', 'Quiet', 'Loud', 'Silent', 'Calm', 'Stormy',
  'Sunny', 'Cloudy', 'Misty', 'Foggy', 'Clear', 'Bright', 'Dim',
  'Luminous', 'Sparkling', 'Gleaming', 'Dull', 'Vivid', 'Pale', 'Faded'
];

export interface TreeNameGeneratorOptions {
  /**
   * Existing tree names to avoid duplicates
   */
  existingNames?: string[];
  
  /**
   * Maximum attempts to generate unique name
   */
  maxAttempts?: number;
  
  /**
   * Custom prefix for the generated name
   */
  prefix?: string;
  
  /**
   * Custom suffix for the generated name
   */
  suffix?: string;
}

export class TreeNameGenerator {
  private static instance: TreeNameGenerator;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): TreeNameGenerator {
    if (!TreeNameGenerator.instance) {
      TreeNameGenerator.instance = new TreeNameGenerator();
    }
    return TreeNameGenerator.instance;
  }
  
  /**
   * Generate a random tree name
   */
  generateName(options: TreeNameGeneratorOptions = {}): string {
    const {
      existingNames = [],
      maxAttempts = 100,
      prefix = '',
      suffix = ''
    } = options;
    
    let attempts = 0;
    let generatedName: string;
    
    do {
      const adjective = this.getRandomElement(ADJECTIVES);
      const treeName = this.getRandomElement(TREE_NAMES);
      
      generatedName = this.formatName(adjective, treeName, prefix, suffix);
      attempts++;
      
      if (attempts >= maxAttempts) {
        // If we can't find a unique name, append a number
        generatedName = this.ensureUniqueness(generatedName, existingNames);
        break;
      }
    } while (existingNames.includes(generatedName));
    
    return generatedName;
  }
  
  /**
   * Generate multiple unique tree names
   */
  generateMultipleNames(count: number, options: TreeNameGeneratorOptions = {}): string[] {
    const names: string[] = [];
    const existingNames = [...(options.existingNames || [])];
    
    for (let i = 0; i < count; i++) {
      const name = this.generateName({
        ...options,
        existingNames: [...existingNames, ...names]
      });
      names.push(name);
    }
    
    return names;
  }
  
  /**
   * Check if a name follows the generated pattern
   */
  isGeneratedName(name: string): boolean {
    const parts = name.split(' ');
    if (parts.length < 2) return false;
    
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    
    return TREE_NAMES.includes(lastPart) && ADJECTIVES.includes(secondLastPart);
  }
  
  /**
   * Get suggestions for similar names
   */
  getSimilarNames(baseName: string, count: number = 5): string[] {
    // Try to extract tree name from existing name
    const words = baseName.split(' ');
    const possibleTreeName = words.find(word => TREE_NAMES.includes(word));
    
    if (possibleTreeName) {
      // Generate variations with the same tree but different adjectives
      const suggestions: string[] = [];
      const usedAdjectives = new Set<string>();
      
      while (suggestions.length < count && usedAdjectives.size < ADJECTIVES.length) {
        const adjective = this.getRandomElement(ADJECTIVES);
        if (!usedAdjectives.has(adjective)) {
          usedAdjectives.add(adjective);
          suggestions.push(`${adjective} ${possibleTreeName}`);
        }
      }
      
      return suggestions;
    }
    
    // If no tree name found, generate completely new names
    return this.generateMultipleNames(count);
  }
  
  /**
   * Get random element from array
   */
  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * Format the generated name with prefix and suffix
   */
  private formatName(adjective: string, treeName: string, prefix: string, suffix: string): string {
    let name = `${adjective} ${treeName}`;
    
    if (prefix) {
      name = `${prefix} ${name}`;
    }
    
    if (suffix) {
      name = `${name} ${suffix}`;
    }
    
    return name;
  }
  
  /**
   * Ensure name uniqueness by appending numbers
   */
  private ensureUniqueness(baseName: string, existingNames: string[]): string {
    if (!existingNames.includes(baseName)) {
      return baseName;
    }
    
    let counter = 1;
    let uniqueName: string;
    
    do {
      uniqueName = `${baseName} ${counter}`;
      counter++;
    } while (existingNames.includes(uniqueName));
    
    return uniqueName;
  }
  
  /**
   * Get all available tree names
   */
  getTreeNames(): string[] {
    return [...TREE_NAMES];
  }
  
  /**
   * Get all available adjectives
   */
  getAdjectives(): string[] {
    return [...ADJECTIVES];
  }
  
  /**
   * Generate name with specific tree type
   */
  generateNameWithTree(treeName: string, options: Omit<TreeNameGeneratorOptions, 'suffix'> = {}): string {
    if (!TREE_NAMES.includes(treeName)) {
      throw new Error(`Invalid tree name: ${treeName}. Available trees: ${TREE_NAMES.join(', ')}`);
    }
    
    const adjective = this.getRandomElement(ADJECTIVES);
    const generatedName = this.formatName(adjective, treeName, options.prefix || '', '');
    
    if (options.existingNames?.includes(generatedName)) {
      return this.ensureUniqueness(generatedName, options.existingNames);
    }
    
    return generatedName;
  }
  
  /**
   * Generate name with specific adjective
   */
  generateNameWithAdjective(adjective: string, options: Omit<TreeNameGeneratorOptions, 'prefix'> = {}): string {
    if (!ADJECTIVES.includes(adjective)) {
      throw new Error(`Invalid adjective: ${adjective}. Available adjectives: ${ADJECTIVES.join(', ')}`);
    }
    
    const treeName = this.getRandomElement(TREE_NAMES);
    const generatedName = this.formatName(adjective, treeName, '', options.suffix || '');
    
    if (options.existingNames?.includes(generatedName)) {
      return this.ensureUniqueness(generatedName, options.existingNames);
    }
    
    return generatedName;
  }
}