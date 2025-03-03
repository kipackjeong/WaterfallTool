// Jest setup file
import '@testing-library/jest-dom';

// Mock the console methods to keep test output clean
global.console = {
  ...console,
  // Uncomment these to silence console methods during tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
};

// Set up any global mocks or configurations here
