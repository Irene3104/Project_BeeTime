#!/usr/bin/env node

// This is a simple wrapper script that runs the TypeScript server directly
import { execSync } from 'child_process';

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.NODE_NO_WARNINGS = '1';

console.log('Starting server via server.js wrapper...');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

try {
  // Run the server using tsx (which handles TypeScript files directly)
  execSync('npx tsx src/server/index.ts', { 
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}