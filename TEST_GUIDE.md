# Testing Guide for Pixtree

## Quick Start

To set up and run tests for your Pixtree project:

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage

# Run specific test file
pnpm test StorageManager

# Run tests in a specific directory
pnpm test tests/unit/
```

## Current Issues & Fixes

The test files currently have some TypeScript type mismatches. Here are the main issues and how to fix them:

### Issue 1: Missing Dependencies
You need to install the testing dependencies:
```bash
pnpm add -D ts-jest ts-node
```

### Issue 2: TreeType Export
The `TreeType` type doesn't exist as a separate export. Use the literal type instead:
```typescript
// Instead of: TreeType
// Use: 'creative' | 'reference' | 'variation' | 'experiment'
```

### Issue 3: Tree Interface Mismatch
The `Tree` interface doesn't have a `settings` property. Update test mocks to match:
```typescript
const mockTree: Tree = {
  // ... other properties
  favorite: false,
  archived: false,
  // Remove: settings, stats.modelUsage, stats.popularTags
  stats: {
    totalGenerations: 4,
    totalImports: 1,
    lastActivity: new Date(),
    avgRating: 4.0,
    mostUsedPrompts: ['prompt1', 'prompt2']
  }
}
```

### Issue 4: TreeManager Method Names
Some methods in tests don't exist in the actual TreeManager:
- `getTreeStructure()` doesn't exist
- `searchInTree()` doesn't exist  
- `validateTreeIntegrity()` doesn't exist

### Issue 5: TreeStats Interface
The `TreeStats` interface has different properties:
```typescript
interface TreeStats {
  totalNodes: number;
  totalSize: number;
  depth: number; // not maxDepth
  branchFactor: number;
  generationCount: number;
  importCount: number;
  averageRating: number;
  tagUsage: Record<string, number>;
  modelUsage: Record<string, number>;
  activityTimeline: { date: string; count: number }[];
}
```

## Running Individual Test Files

Once the type issues are fixed, you can run individual test suites:

```bash
# Test StorageManager
pnpm test StorageManager.test.ts

# Test ProjectManager  
pnpm test ProjectManager.test.ts

# Test ImageVersionControl
pnpm test ImageVersionControl.test.ts
```

## Test Structure

The tests are organized as follows:
```
tests/
├── setup.ts              # Global test setup
├── unit/                  # Unit tests
│   ├── StorageManager.test.ts
│   ├── ProjectManager.test.ts  
│   ├── TreeManager.test.ts
│   └── ImageVersionControl.test.ts
└── tsconfig.json         # TypeScript config for tests
```

## Mock Data

Each test file includes comprehensive mock data that matches the actual type definitions. The mocks cover:

- **Projects**: With metadata, settings, and stats
- **Trees**: With proper type hierarchy
- **ImageNodes**: With all required fields
- **AI Providers**: Mocked for testing generation/analysis
- **Storage Operations**: File system mocks

## Coverage Reports

After running tests with `--coverage`, check the `coverage/` directory for detailed reports:
- Open `coverage/lcov-report/index.html` in your browser for visual coverage
- Terminal output shows coverage percentages by file

## Next Steps

1. Fix the type mismatches in the test files
2. Run `pnpm test` to ensure all tests pass
3. Use the tests to validate new features as you develop them
4. Add integration tests for CLI commands once they're implemented

The test framework is now properly configured with Jest, TypeScript support, and ES modules compatibility.