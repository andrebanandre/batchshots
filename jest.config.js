/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Handle module aliases (if needed)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Add coverage if needed
  collectCoverage: false,
  // Setup for Next.js environment
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
}; 