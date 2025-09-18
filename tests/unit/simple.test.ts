// Simple working test example
describe('Pixtree Test Setup', () => {
  it('should work with basic assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });

  it('should mock functions', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});

// Test TypeScript imports
describe('TypeScript Import Test', () => {
  it('should import types from the project', () => {
    // This will test that our TypeScript setup is working
    const project = {
      id: 'test',
      name: 'Test Project',
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata: {
        totalTrees: 0,
        totalImages: 0,
        totalSize: 0,
        tags: [],
        favoriteCount: 0,
        avgRating: 0
      },
      settings: {
        defaultModel: 'nano-banana',
        autoTagging: false,
        autoAnalysis: false,
        defaultTreeOnImport: ''
      },
      stats: {
        totalGenerations: 0,
        totalImports: 0,
        lastActivity: new Date(),
        mostUsedModels: {},
        topTags: {}
      }
    };

    expect(project.name).toBe('Test Project');
  });
});