export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/?(*.)(spec|test).(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/e2e/'  // Exclude e2e tests from Jest
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/e2e/**/*',  // Exclude e2e from coverage
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      isolatedModules: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        target: 'ES2020',
        module: 'ES2020',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        skipLibCheck: true,
        types: ['jest', '@testing-library/jest-dom', 'node']
      }
    }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};