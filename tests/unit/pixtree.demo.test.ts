// Pixtree Demo Tests - Working examples for your project

describe('Pixtree Demo Tests', () => {
  
  describe('Project ID Generation', () => {
    it('should generate valid project IDs', () => {
      const generateProjectId = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `proj-${timestamp}-${random}`;
      };
      
      const id1 = generateProjectId();
      const id2 = generateProjectId();
      
      expect(id1).toMatch(/^proj-/);
      expect(id2).toMatch(/^proj-/);
      expect(id1).not.toBe(id2);
      expect(id1.split('-')).toHaveLength(3);
    });
  });

  describe('Node ID Generation', () => {
    it('should generate valid node IDs', () => {
      const generateNodeId = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `node-${timestamp}-${random}`;
      };
      
      const nodeId = generateNodeId();
      expect(nodeId).toMatch(/^node-/);
      expect(nodeId.split('-')).toHaveLength(3);
    });
  });

  describe('Tree ID Generation', () => {
    it('should generate valid tree IDs', () => {
      const generateTreeId = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `tree-${timestamp}-${random}`;
      };
      
      const treeId = generateTreeId();
      expect(treeId).toMatch(/^tree-/);
      expect(treeId.split('-')).toHaveLength(3);
    });
  });

  describe('Image Hash Generation', () => {
    it('should generate consistent hashes for same data', () => {
      const generateSimpleHash = (data: string) => {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          const char = data.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
      };
      
      const data1 = 'test-image-data';
      const data2 = 'different-image-data';
      const data3 = 'test-image-data'; // Same as data1
      
      const hash1 = generateSimpleHash(data1);
      const hash2 = generateSimpleHash(data2);
      const hash3 = generateSimpleHash(data3);
      
      expect(hash1).not.toBe(hash2); // Different data = different hash
      expect(hash1).toBe(hash3);     // Same data = same hash
      expect(typeof hash1).toBe('string');
    });
  });

  describe('Project Structure', () => {
    it('should define project structure correctly', () => {
      const projectStructure = {
        project: {
          id: 'proj-123',
          name: 'My Pixtree Project',
          trees: []
        },
        directories: [
          '.pixtree/',
          '.pixtree/trees/',
          'images/',
          'exports/'
        ]
      };
      
      expect(projectStructure.project.name).toBe('My Pixtree Project');
      expect(projectStructure.directories).toContain('.pixtree/');
      expect(projectStructure.directories).toContain('images/');
    });
  });

  describe('Tree Types', () => {
    it('should validate tree types', () => {
      const validTreeTypes = ['creative', 'reference', 'variation', 'experiment'];
      const treeType: string = 'creative';
      
      expect(validTreeTypes).toContain(treeType);
      
      const isValidTreeType = (type: string) => validTreeTypes.includes(type);
      expect(isValidTreeType('creative')).toBe(true);
      expect(isValidTreeType('invalid')).toBe(false);
    });
  });

  describe('Tag Management', () => {
    it('should manage tags correctly', () => {
      const manageTags = (currentTags: string[], newTags: string[]) => {
        const combined = [...currentTags, ...newTags];
        return [...new Set(combined)]; // Remove duplicates
      };
      
      const currentTags = ['nature', 'landscape'];
      const newTags = ['sunset', 'nature']; // 'nature' is duplicate
      
      const result = manageTags(currentTags, newTags);
      
      expect(result).toHaveLength(3);
      expect(result).toContain('nature');
      expect(result).toContain('landscape');
      expect(result).toContain('sunset');
    });
  });

  describe('Rating System', () => {
    it('should validate ratings', () => {
      const isValidRating = (rating: number) => {
        return rating >= 1 && rating <= 5 && Number.isInteger(rating);
      };
      
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(3)).toBe(true);
      expect(isValidRating(5)).toBe(true);
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(6)).toBe(false);
      expect(isValidRating(3.5)).toBe(false);
    });
    
    it('should calculate average ratings', () => {
      const calculateAverageRating = (ratings: number[]) => {
        if (ratings.length === 0) return 0;
        const sum = ratings.reduce((acc, rating) => acc + rating, 0);
        return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
      };
      
      const ratings = [4, 5, 3, 4, 5];
      const average = calculateAverageRating(ratings);
      
      expect(average).toBe(4.2);
    });
  });

  describe('File Path Processing', () => {
    it('should process file paths correctly', () => {
      const processImagePath = (fullPath: string) => {
        const parts = fullPath.split('/');
        const filename = parts[parts.length - 1];
        const extension = filename.split('.').pop();
        const nameWithoutExt = filename.replace(`.${extension}`, '');
        
        return {
          filename,
          extension,
          nameWithoutExt,
          directory: parts.slice(0, -1).join('/')
        };
      };
      
      const result = processImagePath('/users/project/images/sunset.png');
      
      expect(result.filename).toBe('sunset.png');
      expect(result.extension).toBe('png');
      expect(result.nameWithoutExt).toBe('sunset');
      expect(result.directory).toBe('/users/project/images');
    });
  });

  describe('Workspace Context', () => {
    it('should manage workspace context', () => {
      const workspace = {
        currentProject: 'proj-123',
        currentTree: 'tree-456',
        currentNode: null,
        recentProjects: ['proj-123', 'proj-789'],
        settings: {
          defaultModel: 'nano-banana',
          autoSave: true
        }
      };
      
      expect(workspace.currentProject).toBe('proj-123');
      expect(workspace.settings.defaultModel).toBe('nano-banana');
      expect(workspace.recentProjects).toContain('proj-123');
    });
  });
});