const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.json");

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
     "^.+\\.(t|j)sx?$": ["@swc/jest"]
  },
  setupFilesAfterEnv: ["./test-utils/setup.ts"],
  globalSetup: "./test-utils/global-setup.ts",
  globalTeardown: "./test-utils/tear-down.ts",
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>" }),
    "@testUtils": ["<rootDir>/test-utils"],
    "@core": ["./src/core"],
    "@entity": ["./src/entity"],
    "@handler": ["./src/handler"],
    "@error": ["./src/core/error"],
  },
};
