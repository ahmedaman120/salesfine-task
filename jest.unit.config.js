/**
 * Unit-test Jest config.
 *
 * Unlike jest.config.js (integration tests that need a real Postgres/Redis via
 * globalSetup), this config runs fully isolated, mocked unit tests under
 * tests/unit/. It has NO globalSetup, so it requires no running infrastructure.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  clearMocks: true,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/server.ts',
    '!<rootDir>/src/**/*.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/unit',
  coverageReporters: ['text', 'text-summary', 'lcov'],
};
