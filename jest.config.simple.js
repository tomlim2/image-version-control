module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/dist/**'
  ],
  moduleNameMapper: {
    '^@pixtree/core$': '<rootDir>/packages/core/src',
    '^@pixtree/core/(.*)$': '<rootDir>/packages/core/src/$1',
    '\\.js$': ''
  },
  clearMocks: true,
  testTimeout: 10000
};