/**
 * Plugin-based AI Provider system for extensibility
 */

export interface AIProviderConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  [key: string]: any; // Model-specific configs
}

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  config?: Record<string, any>;
  inputImages?: Buffer[]; // For image-to-image generation
}

export interface GenerationResponse {
  imageData: Buffer;
  metadata: {
    model: string;
    parameters: Record<string, any>;
    generationTime: number;
    cost?: number; // API cost if available
  };
}

export interface AnalysisResponse {
  description: string;
  detectedObjects: string[];
  style: string;
  confidence: number;
  suggestedPrompts?: string[];
}

export interface BlendRequest {
  prompt1: string;
  prompt2: string;
  strategy: 'blend' | 'combine' | 'average';
  weights?: { prompt1: number; prompt2: number };
}

export interface BlendResponse {
  blendedPrompt: string;
  explanation: string;
  expectedChanges: string[];
  confidence: number;
}

/**
 * Abstract base class for AI providers
 * Implement this to add support for new AI models
 */
export abstract class AIProvider {
  abstract readonly name: string;
  abstract readonly supportedFeatures: {
    textToImage: boolean;
    imageToImage: boolean;
    imageAnalysis: boolean;
    promptBlending: boolean;
  };
  
  protected config: AIProviderConfig;
  
  constructor(config: AIProviderConfig) {
    this.config = config;
  }
  
  /**
   * Generate image from text prompt
   */
  abstract generateImage(request: GenerationRequest): Promise<GenerationResponse>;
  
  /**
   * Analyze image content (optional)
   */
  async analyzeImage?(imageData: Buffer): Promise<AnalysisResponse>;
  
  /**
   * Blend two prompts intelligently (optional)
   */
  async blendPrompts?(request: BlendRequest): Promise<BlendResponse>;
  
  /**
   * Validate provider configuration
   */
  abstract validateConfig(config: AIProviderConfig): boolean;
  
  /**
   * Get default configuration for this provider
   */
  abstract getDefaultConfig(): Record<string, any>;
  
  /**
   * Test provider connection
   */
  abstract testConnection(): Promise<boolean>;
}

/**
 * Provider registry for managing multiple AI providers
 */
export class AIProviderRegistry {
  private providers = new Map<string, new (config: AIProviderConfig) => AIProvider>();
  private instances = new Map<string, AIProvider>();
  
  /**
   * Register a new AI provider
   */
  register(name: string, providerClass: new (config: AIProviderConfig) => AIProvider): void {
    this.providers.set(name, providerClass);
  }
  
  /**
   * Get available provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Create provider instance with config
   */
  createProvider(name: string, config: AIProviderConfig): AIProvider {
    const ProviderClass = this.providers.get(name);
    if (!ProviderClass) {
      throw new Error(`Provider '${name}' not found`);
    }
    
    const instance = new ProviderClass(config);
    this.instances.set(name, instance);
    return instance;
  }
  
  /**
   * Get existing provider instance
   */
  getProvider(name: string): AIProvider | undefined {
    return this.instances.get(name);
  }
  
  /**
   * List registered providers with their features
   */
  listProviders(): Array<{
    name: string;
    features: string[];
  }> {
    return Array.from(this.providers.entries()).map(([name, ProviderClass]) => {
      // Get default features without instantiating
      const defaultFeatures = ['text-to-image', 'image-analysis'];
      return {
        name,
        features: defaultFeatures
      };
    });
  }
}