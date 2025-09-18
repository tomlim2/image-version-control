// First User Journey Test - Complete end-to-end flow
import { ImageVersionControl } from '../../packages/core/src/ImageVersionControl';
import { ProjectCreationOptions, GenerateOptions, ImportOptions } from '../../packages/core/src/types/index';

// Mock fs-extra
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  writeJSON: jest.fn().mockResolvedValue(undefined),
  readJSON: jest.fn().mockResolvedValue({}),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
  copy: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined)
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn((p) => p.split('/').pop()),
  extname: jest.fn((p) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/'))
}));

// Mock AI Provider
const mockGenerateImage = jest.fn();
jest.mock('../../packages/core/src/ai/NanoBananaProvider.js', () => ({
  NanoBananaProvider: class MockNanoBananaProvider {
    async generateImage(params: any) {
      return mockGenerateImage(params);
    }
    async analyzeImage(imageData: Buffer) {
      return {
        description: 'A beautiful landscape scene',
        detectedObjects: ['tree', 'mountain', 'sky'],
        style: 'photorealistic',
        confidence: 0.9
      };
    }
  }
}));

describe('First User Journey - Complete Flow', () => {
  let pixtree: ImageVersionControl;
  const testProjectPath = '/Users/testuser/my-first-pixtree-project';
  
  beforeEach(() => {
    jest.clearAllMocks();
    pixtree = new ImageVersionControl(testProjectPath);
    
    // Setup default mock responses
    mockGenerateImage.mockResolvedValue({
      imageData: Buffer.from('generated-image-data'),
      metadata: {
        parameters: { temperature: 1.0, model: 'nano-banana' },
        generationTime: 3.2
      }
    });
  });

  describe('🚀 New User Journey: From Zero to First Generated Image', () => {
    it('should complete the full first-time user flow', async () => {
      // 1. 👋 User creates their first Pixtree project
      console.log('📝 Step 1: Initialize new Pixtree project');
      
      const projectOptions: ProjectCreationOptions = {
        name: 'My First AI Art Project',
        description: 'Learning to use Pixtree for AI image generation',
        defaultModel: 'nano-banana'
      };

      const project = await pixtree.init({ 
        ...projectOptions, 
        apiKey: 'sk-test-api-key-123' 
      });

      // Verify project creation
      expect(project.name).toBe('My First AI Art Project');
      expect(project.id).toMatch(/^proj-/);
      expect(project.settings.defaultTreeOnImport).toBeTruthy();
      console.log('✅ Project created:', project.name);

      // 2. 🌳 Check initial project structure
      console.log('📝 Step 2: Verify project has initial tree');
      
      const trees = await pixtree.getTrees();
      expect(trees).toHaveLength(1);
      expect(trees[0].name).toBe('Main');
      expect(trees[0].type).toBe('creative');
      console.log('✅ Initial tree created:', trees[0].name);

      // 3. 🎨 Generate first AI image
      console.log('📝 Step 3: Generate first AI image');
      
      const firstPrompt = 'A serene mountain landscape at sunset with vibrant colors';
      const generateOptions: GenerateOptions = {
        model: 'nano-banana',
        tags: ['landscape', 'sunset', 'mountains'],
        purpose: 'My first AI-generated artwork'
      };

      const firstImage = await pixtree.generate(firstPrompt, generateOptions);

      // Verify image generation
      expect(firstImage.id).toMatch(/^node-/);
      expect(firstImage.projectId).toBe(project.id);
      expect(firstImage.treeId).toBe(trees[0].id);
      expect(firstImage.source).toBe('generated');
      expect(firstImage.model).toBe('nano-banana');
      expect(firstImage.generationParams?.prompt).toBe(firstPrompt);
      expect(firstImage.userMetadata.tags).toEqual(['landscape', 'sunset', 'mountains']);
      expect(firstImage.success).toBe(true);
      console.log('✅ First image generated:', firstImage.id);

      // 4. ⭐ User likes their image and marks it as favorite
      console.log('📝 Step 4: Mark favorite image');
      
      const favoriteImage = await pixtree.updateNode(firstImage.id, {
        favorite: true,
        rating: 5,
        notes: 'This is my first successful AI art!'
      });

      expect(favoriteImage.userMetadata.favorite).toBe(true);
      expect(favoriteImage.userMetadata.rating).toBe(5);
      console.log('✅ Image marked as favorite with rating 5');

      // 5. 🔄 Generate a variation from the first image
      console.log('📝 Step 5: Generate variation from first image');
      
      const variationPrompt = 'A serene mountain landscape at sunrise with golden hour lighting';
      const variationOptions: GenerateOptions = {
        model: 'nano-banana',
        parentId: firstImage.id,
        tags: ['landscape', 'sunrise', 'variation'],
        purpose: 'Exploring different lighting conditions'
      };

      const variationImage = await pixtree.generate(variationPrompt, variationOptions);

      // Verify variation
      expect(variationImage.parentId).toBe(firstImage.id);
      expect(variationImage.treePosition.depth).toBe(1);
      expect(variationImage.generationParams?.derivedFrom).toBe(firstImage.id);
      console.log('✅ Variation created from first image');

      // 6. 📥 Import a reference image
      console.log('📝 Step 6: Import reference image');
      
      const importOptions: ImportOptions = {
        importMethod: 'root',
        description: 'Reference photo for mountain landscapes',
        tags: ['reference', 'mountains', 'photography'],
        analyzeWithAI: true,
        purpose: 'Reference material for future generations'
      };

      const importedImage = await pixtree.import('/Users/testuser/photos/mountain-ref.jpg', importOptions);

      // Verify import
      expect(importedImage.source).toBe('imported');
      expect(importedImage.importInfo?.originalFilename).toBe('mountain-ref.jpg');
      expect(importedImage.userMetadata.tags).toContain('reference');
      expect(importedImage.aiAnalysis).toBeDefined();
      console.log('✅ Reference image imported and analyzed');

      // 7. 📊 Check project status and statistics
      console.log('📝 Step 7: Check project status');
      
      const status = await pixtree.getStatus();
      const projectStats = await pixtree.getProjectStats();

      // Verify status
      expect(status.context.currentProject?.id).toBe(project.id);
      expect(status.projectStats.totalImages).toBe(3); // 2 generated + 1 imported
      expect(status.suggestedActions).toBeDefined();
      
      expect(projectStats.totalImages).toBe(3);
      expect(projectStats.favoriteCount).toBe(1);
      expect(projectStats.imagesByModel['nano-banana']).toBe(2);
      console.log('✅ Project status verified:', status.projectStats);

      // 8. 💾 Export favorite image
      console.log('📝 Step 8: Export favorite image');
      
      const exportPath = '/Users/testuser/exports/my-first-ai-art.png';
      await pixtree.export(firstImage.id, exportPath, 'My First AI Art');

      // Verify export tracking
      const exportedImage = await pixtree.getCurrentNode();
      // Note: We'd need to load the node again to see exports
      console.log('✅ Image exported successfully');

      // 9. 🎯 Final verification - user has a working Pixtree project
      console.log('📝 Step 9: Final verification');
      
      const finalTree = await pixtree.getTree();
      const workspace = await pixtree.getWorkspaceContext();

      expect(finalTree).toHaveLength(1); // One root node
      expect(finalTree[0].children).toHaveLength(1); // One variation
      expect(workspace.currentProject?.name).toBe('My First AI Art Project');
      
      console.log('🎉 SUCCESS: First user journey completed!');
      console.log(`   📁 Project: ${workspace.currentProject?.name}`);
      console.log(`   🌳 Trees: ${status.projectStats.totalTrees}`);
      console.log(`   🖼️  Images: ${status.projectStats.totalImages}`);
      console.log(`   ⭐ Favorites: ${projectStats.favoriteCount}`);
    });
  });

  describe('🔍 User Journey: Import and Organize', () => {
    it('should handle import workflow with smart tree assignment', async () => {
      // Setup project
      const project = await pixtree.init({
        name: 'Reference Collection',
        description: 'Organizing my reference images',
        apiKey: 'test-key'
      });

      // Import reference image - should auto-create reference tree
      const refImage = await pixtree.import('/refs/inspiration/concept-art.jpg', {
        importMethod: 'root',
        analyzeWithAI: true,
        tags: ['concept-art', 'inspiration']
      });

      // Verify smart tree assignment
      expect(refImage.source).toBe('imported');
      expect(refImage.importInfo?.autoAssignedTree).toBeTruthy();
      
      const trees = await pixtree.getTrees();
      expect(trees.some(tree => tree.type === 'reference')).toBe(true);
      
      console.log('✅ Smart import workflow working');
    });
  });

  describe('⚡ User Journey: Quick Creative Session', () => {
    it('should support rapid iteration workflow', async () => {
      // Setup
      const project = await pixtree.init({
        name: 'Quick Art Session',
        apiKey: 'test-key'
      });

      // Rapid fire generation
      const prompts = [
        'cute cat with blue eyes',
        'same cat but with green eyes',
        'same cat but as a watercolor painting'
      ];

      const images = [];
      for (let i = 0; i < prompts.length; i++) {
        const image = await pixtree.generate(prompts[i], {
          model: 'nano-banana',
          parentId: i > 0 ? images[i-1].id : undefined,
          tags: ['cat', 'iteration']
        });
        images.push(image);
      }

      // Verify chain
      expect(images).toHaveLength(3);
      expect(images[1].parentId).toBe(images[0].id);
      expect(images[2].parentId).toBe(images[1].id);
      expect(images[2].treePosition.depth).toBe(2);
      
      console.log('✅ Rapid iteration workflow working');
    });
  });

  describe('🎨 User Journey: Creative Exploration', () => {
    it('should support branching creative exploration', async () => {
      // Setup
      const project = await pixtree.init({
        name: 'Creative Exploration',
        apiKey: 'test-key'
      });

      // Base image
      const baseImage = await pixtree.generate('abstract geometric art', {
        model: 'nano-banana',
        tags: ['abstract', 'base']
      });

      // Multiple variations from same base
      const variations = await Promise.all([
        pixtree.generate('abstract geometric art with warm colors', {
          model: 'nano-banana',
          parentId: baseImage.id,
          tags: ['abstract', 'warm']
        }),
        pixtree.generate('abstract geometric art with cool colors', {
          model: 'nano-banana',
          parentId: baseImage.id,
          tags: ['abstract', 'cool']
        }),
        pixtree.generate('abstract geometric art in minimalist style', {
          model: 'nano-banana',
          parentId: baseImage.id,
          tags: ['abstract', 'minimal']
        })
      ]);

      // Verify branching structure
      expect(variations).toHaveLength(3);
      variations.forEach(variation => {
        expect(variation.parentId).toBe(baseImage.id);
        expect(variation.treePosition.depth).toBe(1);
      });

      const tree = await pixtree.getTree();
      expect(tree[0].children).toHaveLength(3);
      
      console.log('✅ Creative branching workflow working');
    });
  });
});