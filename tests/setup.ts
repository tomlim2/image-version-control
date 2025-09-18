// Global test setup

// Increase timeout for tests that might take longer
jest.setTimeout(10000);

// Mock console methods to avoid noise during tests
beforeEach(() => {
  // Silence console warnings in tests unless explicitly testing them
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global test utilities
(global as any).mockBuffer = (data: string) => Buffer.from(data, 'utf-8');

// Mock Date.now for consistent timestamps in tests
const mockNow = new Date('2024-01-01T00:00:00.000Z');
jest.spyOn(Date, 'now').mockImplementation(() => mockNow.getTime());