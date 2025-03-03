module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/renderer/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'renderer/**/*.{ts,tsx}',
    '!renderer/**/*.d.ts',
    '!renderer/pages/_*.{ts,tsx}',
    '!**/node_modules/**',
  ],
};
