export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/?(*.)(spec|test).(ts|tsx|js)',
    '<rootDir>/scripts/**/__tests__/**/*.(ts|js)',
    '<rootDir>/scripts/**/?(*.)(spec|test).(ts|js)'
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
      },
      // Rewrite `import.meta.env` → `__VITE_ENV__` so source files that read
      // Vite env vars (notably src/App.tsx) compile under CommonJS. The
      // runtime global is installed by src/setupTests.ts. See
      // src/jest-transforms/vite-env.ts for the transformer.
      astTransformers: {
        before: ['<rootDir>/src/jest-transforms/vite-env.ts'],
      },
    }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};