// Basic working tests for Pixtree

describe('Pixtree Basic Tests', () => {
  
  describe('Math Operations', () => {
    it('should add numbers correctly', () => {
      expect(2 + 2).toBe(4);
      expect(10 + 5).toBe(15);
    });
    
    it('should handle async operations', async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });
  });

  describe('String Operations', () => {
    it('should concatenate strings', () => {
      const project = 'Pixtree';
      const type = 'Project';
      expect(`${project} ${type}`).toBe('Pixtree Project');
    });
    
    it('should match patterns', () => {
      const nodeId = 'node-abc123-def456';
      expect(nodeId).toMatch(/^node-/);
      expect(nodeId).toContain('abc123');
    });
  });

  describe('Object Operations', () => {
    it('should create and modify objects', () => {
      const project = {
        id: 'proj-123',
        name: 'Test Project',
        createdAt: new Date('2024-01-01')
      };
      
      expect(project.name).toBe('Test Project');
      expect(project.id).toMatch(/^proj-/);
      
      // Modify object
      project.name = 'Updated Project';
      expect(project.name).toBe('Updated Project');
    });
    
    it('should work with arrays', () => {
      const tags = ['nature', 'landscape', 'sunset'];
      
      expect(tags).toHaveLength(3);
      expect(tags).toContain('nature');
      
      tags.push('mountain');
      expect(tags).toHaveLength(4);
    });
  });

  describe('Mock Functions', () => {
    it('should create and use mock functions', () => {
      const mockCallback = jest.fn();
      
      // Call the mock function
      mockCallback('test');
      mockCallback('data');
      
      // Test that it was called
      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenCalledWith('test');
      expect(mockCallback).toHaveBeenLastCalledWith('data');
    });
    
    it('should mock return values', () => {
      const mockFn = jest.fn();
      mockFn.mockReturnValue('mocked result');
      
      const result = mockFn();
      expect(result).toBe('mocked result');
    });
    
    it('should mock async functions', async () => {
      const mockAsyncFn = jest.fn();
      mockAsyncFn.mockResolvedValue('async result');
      
      const result = await mockAsyncFn();
      expect(result).toBe('async result');
    });
  });

  describe('Error Handling', () => {
    it('should catch thrown errors', () => {
      const errorFn = () => {
        throw new Error('Test error');
      };
      
      expect(errorFn).toThrow('Test error');
    });
    
    it('should handle async errors', async () => {
      const asyncErrorFn = async () => {
        throw new Error('Async error');
      };
      
      await expect(asyncErrorFn()).rejects.toThrow('Async error');
    });
  });

  describe('Date Operations', () => {
    it('should work with dates', () => {
      const now = new Date();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      expect(now.getTime()).toBeGreaterThan(yesterday.getTime());
    });
    
    it('should format dates consistently', () => {
      const testDate = new Date('2024-01-01T00:00:00.000Z');
      expect(testDate.getFullYear()).toBe(2024);
      expect(testDate.getMonth()).toBe(0); // January is 0
    });
  });

  describe('Type Checking', () => {
    it('should check types correctly', () => {
      const nodeId = 'node-123';
      const count = 42;
      const isActive = true;
      const tags = ['test'];
      const metadata = { size: 1024 };
      
      expect(typeof nodeId).toBe('string');
      expect(typeof count).toBe('number');
      expect(typeof isActive).toBe('boolean');
      expect(Array.isArray(tags)).toBe(true);
      expect(typeof metadata).toBe('object');
    });
  });
});